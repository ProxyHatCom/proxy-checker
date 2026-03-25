import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Header } from './components/Header';
import { ControlsBar } from './components/ControlsBar';
import { ActionBar } from './components/ActionBar';
import { SelectionBar } from './components/SelectionBar';
import { ProxyTable } from './components/ProxyTable';
import { StatusBar } from './components/StatusBar';
import { BulkPasteModal } from './components/BulkPasteModal';
import { SettingsModal, Settings } from './components/SettingsModal';
import { Toast } from './components/Toast';
import { useProxyStore } from './hooks/useProxyStore';
import { FilterState, defaultFilters, applyFilters } from './utils/filters';
import { copyToClipboard, exportCsv, exportTxt } from './utils/export';
import { ProxyEntry, ProxyResult, ProxyType, CheckConfig } from './types/proxy';
import './styles/global.css';

const DEFAULT_SETTINGS: Settings = {
  defaultUrl: 'https://www.google.com',
  defaultThreads: 10,
  connectionTimeout: 5,
  requestTimeout: 10,
};

function App() {
  const store = useProxyStore();
  const [url, setUrl] = useState(DEFAULT_SETTINGS.defaultUrl);
  const [threads, setThreads] = useState(DEFAULT_SETTINGS.defaultThreads);
  const [isChecking, setIsChecking] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showPaste, setShowPaste] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [appVersion, setAppVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState<{ version: string; body?: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem('proxychecker-settings');
      if (!saved) return DEFAULT_SETTINGS;
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      // Clamp values to valid ranges
      parsed.defaultThreads = Math.min(50, Math.max(1, parsed.defaultThreads || 10));
      parsed.connectionTimeout = Math.min(60, Math.max(1, parsed.connectionTimeout || 5));
      parsed.requestTimeout = Math.min(60, Math.max(1, parsed.requestTimeout || 10));
      return parsed;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem('proxychecker-settings', JSON.stringify(settings));
  }, [settings]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  // Get version and check for updates on startup
  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => {});
    check().then(update => {
      if (update) {
        setUpdateAvailable({ version: update.version, body: update.body ?? undefined });
      }
    }).catch(() => {});
  }, []);

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch (err) {
      showToast(`Update failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
      setIsUpdating(false);
    }
  }, [showToast]);

  // Listen for proxy results from Rust — attach once, use ref for callback
  const updateResultRef = useRef(store.updateResult);
  updateResultRef.current = store.updateResult;

  useEffect(() => {
    let unlisten1: (() => void) | undefined;
    let unlisten2: (() => void) | undefined;

    (async () => {
      unlisten1 = await listen<ProxyResult>('proxy-result', (event) => {
        updateResultRef.current(event.payload);
      });

      unlisten2 = await listen<{ id: string; status: string }>('proxy-status', (event) => {
        updateResultRef.current({
          id: event.payload.id,
          status: event.payload.status as ProxyResult['status'],
          latency_ms: null,
          download_speed_mbps: null,
          real_ip: null,
          country: null,
          city: null,
          anonymity: 'unknown',
          error: null,
          checked_at: null,
        });
      });
    })();

    return () => {
      unlisten1?.();
      unlisten2?.();
    };
  }, []);

  const handleCheckAll = useCallback(async () => {
    if (store.proxies.length === 0) {
      showToast('Add proxies first', 'error');
      return;
    }
    setIsChecking(true);

    const entries: ProxyEntry[] = store.proxies
      .filter(p => p.host && p.port)
      .map(p => ({
        id: p.id,
        proxy_type: p.proxy_type,
        host: p.host,
        port: p.port,
        username: p.username,
        password: p.password,
      }));

    if (entries.length === 0) {
      showToast('No valid proxies to check (need host and port)', 'error');
      setIsChecking(false);
      return;
    }

    const config: CheckConfig = {
      destination_url: url || 'https://www.google.com',
      max_threads: threads,
      connection_timeout_secs: settings.connectionTimeout,
      request_timeout_secs: settings.requestTimeout,
      check_endpoint_url: 'https://checker-api.proxyhat.com/check',
    };

    try {
      await invoke('check_all_proxies', { entries, config });
    } catch (err) {
      showToast(`Check failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsChecking(false);
    }
  }, [store.proxies, url, threads, settings, showToast]);

  const handleStop = useCallback(async () => {
    setIsChecking(false);
    try {
      await invoke('stop_checking');
    } catch (err) {
      console.error('Stop failed:', err);
    }
  }, []);

  const handlePasteImport = useCallback((parsed: { proxy_type: string; host: string; port: number; username: string | null; password: string | null }[]) => {
    store.addProxies(parsed.map(p => ({
      proxy_type: p.proxy_type as ProxyEntry['proxy_type'],
      host: p.host,
      port: p.port,
      username: p.username,
      password: p.password,
    })));
    showToast(`Imported ${parsed.length} proxies`, 'success');
  }, [store.addProxies, showToast]);

  const filteredProxies = applyFilters(store.proxies, filters);

  // Selection handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    const allIds = filteredProxies.map(p => p.id);
    setSelectedIds(prev => {
      const allSelected = allIds.every(id => prev.has(id));
      if (allSelected) return new Set();
      return new Set(allIds);
    });
  }, [filteredProxies]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredProxies.map(p => p.id)));
  }, [filteredProxies]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk actions
  const handleBulkChangeType = useCallback((type: ProxyType) => {
    selectedIds.forEach(id => store.updateProxy(id, { proxy_type: type }));
    showToast(`Changed type to ${type.toUpperCase()} for ${selectedIds.size} proxies`);
  }, [selectedIds, store.updateProxy, showToast]);

  const handleBulkChangePort = useCallback((port: number) => {
    selectedIds.forEach(id => store.updateProxy(id, { port }));
    showToast(`Changed port to ${port} for ${selectedIds.size} proxies`);
  }, [selectedIds, store.updateProxy, showToast]);

  const handleBulkDelete = useCallback(() => {
    selectedIds.forEach(id => store.removeProxy(id));
    setSelectedIds(new Set());
    showToast(`Deleted ${selectedIds.size} proxies`);
  }, [selectedIds, store.removeProxy, showToast]);

  const handleBulkCopy = useCallback(async () => {
    const selected = store.proxies.filter(p => selectedIds.has(p.id));
    const ok = await copyToClipboard(selected);
    showToast(ok ? `Copied ${selected.length} proxies` : 'Failed to copy', ok ? 'success' : 'error');
  }, [selectedIds, store.proxies, showToast]);

  const handleBulkRecheck = useCallback(async () => {
    const entries: ProxyEntry[] = store.proxies
      .filter(p => selectedIds.has(p.id) && p.host && p.port)
      .map(p => ({
        id: p.id, proxy_type: p.proxy_type, host: p.host,
        port: p.port, username: p.username, password: p.password,
      }));

    if (entries.length === 0) {
      showToast('No valid selected proxies to check', 'error');
      return;
    }

    setIsChecking(true);
    const config: CheckConfig = {
      destination_url: url || 'https://www.google.com',
      max_threads: threads,
      connection_timeout_secs: settings.connectionTimeout,
      request_timeout_secs: settings.requestTimeout,
      check_endpoint_url: 'https://checker-api.proxyhat.com/check',
    };

    try {
      await invoke('check_all_proxies', { entries, config });
    } catch (err) {
      showToast(`Check failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsChecking(false);
    }
  }, [selectedIds, store.proxies, url, threads, settings, showToast]);

  const handleCopyClipboard = useCallback(async () => {
    const ok = await copyToClipboard(filteredProxies);
    showToast(ok ? 'Copied to clipboard' : 'Failed to copy', ok ? 'success' : 'error');
  }, [filteredProxies, showToast]);

  const countries = [...new Set(
    store.proxies
      .filter(p => p.result?.country)
      .map(p => p.result!.country!)
  )].sort();

  return (
    <>
      <Header
        onSettingsClick={() => setShowSettings(true)}
        version={appVersion}
        updateAvailable={updateAvailable}
        isUpdating={isUpdating}
        onUpdate={handleUpdate}
      />
      <ControlsBar
        url={url}
        onUrlChange={setUrl}
        threads={threads}
        onThreadsChange={setThreads}
        onCheckAll={handleCheckAll}
        onStop={handleStop}
        isChecking={isChecking}
      />
      <ActionBar
        onAdd={() => store.addProxy()}
        onPaste={() => setShowPaste(true)}
        onClear={() => { store.clearAll(); setSelectedIds(new Set()); }}
        filters={filters}
        onFiltersChange={setFilters}
        onExportClipboard={handleCopyClipboard}
        onExportCsv={() => { exportCsv(filteredProxies); showToast('CSV exported'); }}
        onExportTxt={() => { exportTxt(filteredProxies); showToast('TXT exported'); }}
        countries={countries}
      />
      {selectedIds.size > 0 && (
        <SelectionBar
          count={selectedIds.size}
          total={filteredProxies.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onChangeType={handleBulkChangeType}
          onChangePort={handleBulkChangePort}
          onRecheck={handleBulkRecheck}
          onCopy={handleBulkCopy}
          onDelete={handleBulkDelete}
        />
      )}
      <ProxyTable
        proxies={filteredProxies}
        onUpdate={store.updateProxy}
        onRemove={store.removeProxy}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleAll={handleToggleAll}
      />
      <StatusBar proxies={store.proxies} />

      <BulkPasteModal
        isOpen={showPaste}
        onClose={() => setShowPaste(false)}
        onImport={handlePasteImport}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={setSettings}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

export default App;
