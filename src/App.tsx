import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Header } from './components/Header';
import { ControlsBar } from './components/ControlsBar';
import { ActionBar } from './components/ActionBar';
import { ProxyTable } from './components/ProxyTable';
import { StatusBar } from './components/StatusBar';
import { BulkPasteModal } from './components/BulkPasteModal';
import { SettingsModal, Settings } from './components/SettingsModal';
import { useProxyStore } from './hooks/useProxyStore';
import { FilterState, defaultFilters, applyFilters } from './utils/filters';
import { copyToClipboard, exportCsv, exportTxt } from './utils/export';
import { ProxyEntry, ProxyResult, CheckConfig } from './types/proxy';
import './styles/global.css';

const DEFAULT_SETTINGS: Settings = {
  defaultUrl: 'https://www.google.com',
  defaultThreads: 10,
  connectionTimeout: 5,
  requestTimeout: 10,
  maxDownloadKb: 95,
};

function App() {
  const store = useProxyStore();
  const [url, setUrl] = useState(DEFAULT_SETTINGS.defaultUrl);
  const [threads, setThreads] = useState(DEFAULT_SETTINGS.defaultThreads);
  const [isChecking, setIsChecking] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showPaste, setShowPaste] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('proxychecker-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const abortRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('proxychecker-settings', JSON.stringify(settings));
  }, [settings]);

  // Listen for proxy results from Rust
  useEffect(() => {
    const unlisten1 = listen<ProxyResult>('proxy-result', (event) => {
      store.updateResult(event.payload);
    });

    const unlisten2 = listen<{ id: string; status: string }>('proxy-status', (event) => {
      store.updateResult({
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

    return () => {
      unlisten1.then(fn => fn());
      unlisten2.then(fn => fn());
    };
  }, [store.updateResult]);

  const handleCheckAll = useCallback(async () => {
    if (store.proxies.length === 0) return;
    abortRef.current = false;
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

    const config: CheckConfig = {
      destination_url: url || 'https://www.google.com',
      max_threads: threads,
      connection_timeout_secs: settings.connectionTimeout,
      request_timeout_secs: settings.requestTimeout,
      max_download_bytes: settings.maxDownloadKb * 1024,
      check_endpoint_url: 'https://checker-api.proxyhat.com/check',
    };

    try {
      await invoke('check_all_proxies', { entries, config });
    } catch (err) {
      console.error('Check failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, [store.proxies, url, threads, settings]);

  const handleStop = useCallback(async () => {
    abortRef.current = true;
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
  }, [store.addProxies]);

  const filteredProxies = applyFilters(store.proxies, filters);

  const countries = [...new Set(
    store.proxies
      .filter(p => p.result?.country)
      .map(p => p.result!.country!)
  )].sort();

  return (
    <>
      <Header onSettingsClick={() => setShowSettings(true)} />
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
        onClear={store.clearAll}
        filters={filters}
        onFiltersChange={setFilters}
        onExportClipboard={() => copyToClipboard(filteredProxies)}
        onExportCsv={() => exportCsv(filteredProxies)}
        onExportTxt={() => exportTxt(filteredProxies)}
        countries={countries}
      />
      <ProxyTable
        proxies={filteredProxies}
        onUpdate={store.updateProxy}
        onRemove={store.removeProxy}
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
    </>
  );
}

export default App;
