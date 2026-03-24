import { useState, Fragment, useMemo } from 'react';
import { ProxyRow, ProxyType } from '../types/proxy';
import styles from './ProxyTable.module.css';

interface ProxyTableProps {
  proxies: ProxyRow[];
  onUpdate: (id: string, updates: Partial<ProxyRow>) => void;
  onRemove: (id: string) => void;
}

type SortKey = 'type' | 'host' | 'port' | 'status' | 'latency' | 'speed' | 'country' | 'anonymity';
type SortDir = 'asc' | 'desc';

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === 'pending') return <span className={styles.statusPending}>--</span>;
  if (status === 'checking') return <span className={styles.statusChecking}>checking</span>;
  if (status === 'alive') return <span className={styles.statusAlive}>ALIVE</span>;
  if (status === 'dead') return <span className={styles.statusDead}>DEAD</span>;
  if (status === 'destinationunreachable') return <span className={styles.statusWarn}>DST ERR</span>;
  return <span>{status}</span>;
}

function formatSpeed(mbps: number | null | undefined): string {
  if (mbps == null) return '--';
  if (mbps < 1) return `${(mbps * 1000).toFixed(0)} KB/s`;
  return `${mbps.toFixed(1)} MB/s`;
}

function AnonymityBadge({ level }: { level?: string }) {
  if (!level || level === 'unknown') return <span className={styles.anonUnknown}>--</span>;
  if (level === 'elite') return <span className={styles.anonElite}>Elite</span>;
  if (level === 'anonymous') return <span className={styles.anonAnon}>Anon</span>;
  return <span className={styles.anonTransparent}>Transp</span>;
}

function getSortValue(p: ProxyRow, key: SortKey): string | number {
  switch (key) {
    case 'type': return p.proxy_type;
    case 'host': return p.host;
    case 'port': return p.port;
    case 'status': {
      const order: Record<string, number> = { alive: 0, destinationunreachable: 1, checking: 2, dead: 3, pending: 4 };
      return order[p.result?.status ?? 'pending'] ?? 5;
    }
    case 'latency': return p.result?.latency_ms ?? 999999;
    case 'speed': return p.result?.download_speed_mbps ?? -1;
    case 'country': return p.result?.country ?? 'zzz';
    case 'anonymity': {
      const order: Record<string, number> = { elite: 0, anonymous: 1, transparent: 2, unknown: 3 };
      return order[p.result?.anonymity ?? 'unknown'] ?? 4;
    }
    default: return 0;
  }
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className={styles.sortIcon}>&#8597;</span>;
  return <span className={styles.sortIconActive}>{dir === 'asc' ? '\u2191' : '\u2193'}</span>;
}

export function ProxyTable({ proxies, onUpdate, onRemove }: ProxyTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); } // third click resets
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return proxies;
    return [...proxies].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [proxies, sortKey, sortDir]);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thType} onClick={() => handleSort('type')} role="button" aria-label="Sort by type">
              Type <SortIcon active={sortKey === 'type'} dir={sortDir} />
            </th>
            <th className={styles.thHost} onClick={() => handleSort('host')} role="button" aria-label="Sort by host">
              Host <SortIcon active={sortKey === 'host'} dir={sortDir} />
            </th>
            <th className={styles.thPort} onClick={() => handleSort('port')} role="button" aria-label="Sort by port">
              Port <SortIcon active={sortKey === 'port'} dir={sortDir} />
            </th>
            <th className={styles.thUser}>Username</th>
            <th className={styles.thPass}>Password</th>
            <th className={styles.thStatus} onClick={() => handleSort('status')} role="button" aria-label="Sort by status">
              Status <SortIcon active={sortKey === 'status'} dir={sortDir} />
            </th>
            <th className={styles.thLat} onClick={() => handleSort('latency')} role="button" aria-label="Sort by latency">
              Latency <SortIcon active={sortKey === 'latency'} dir={sortDir} />
            </th>
            <th className={styles.thSpeed} onClick={() => handleSort('speed')} role="button" aria-label="Sort by speed">
              Speed <SortIcon active={sortKey === 'speed'} dir={sortDir} />
            </th>
            <th className={styles.thGeo} onClick={() => handleSort('country')} role="button" aria-label="Sort by country">
              Country <SortIcon active={sortKey === 'country'} dir={sortDir} />
            </th>
            <th className={styles.thAnon} onClick={() => handleSort('anonymity')} role="button" aria-label="Sort by anonymity">
              Anon <SortIcon active={sortKey === 'anonymity'} dir={sortDir} />
            </th>
            <th className={styles.thActions}></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <Fragment key={p.id}>
              <tr
                className={`${styles.row} ${expandedId === p.id ? styles.rowExpanded : ''}`}
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              >
                <td>
                  <select
                    value={p.proxy_type}
                    onChange={e => { e.stopPropagation(); onUpdate(p.id, { proxy_type: e.target.value as ProxyType }); }}
                    onClick={e => e.stopPropagation()}
                    className={styles.typeSelect}
                  >
                    <option value="http">HTTP</option>
                    <option value="socks5">SOCKS5</option>
                    <option value="socks5h">SOCKS5h</option>
                  </select>
                </td>
                <td>
                  <input
                    className={styles.cellInput}
                    value={p.host}
                    onChange={e => onUpdate(p.id, { host: e.target.value })}
                    onClick={e => e.stopPropagation()}
                    placeholder="host / IP"
                    spellCheck={false}
                  />
                </td>
                <td>
                  <input
                    className={styles.cellInputSmall}
                    type="number"
                    value={p.port || ''}
                    onChange={e => {
                      const v = parseInt(e.target.value) || 0;
                      if (v >= 0 && v <= 65535) onUpdate(p.id, { port: v });
                    }}
                    onClick={e => e.stopPropagation()}
                    placeholder="port"
                    min={0}
                    max={65535}
                  />
                </td>
                <td>
                  <input
                    className={styles.cellInput}
                    value={p.username ?? ''}
                    onChange={e => onUpdate(p.id, { username: e.target.value || null })}
                    onClick={e => e.stopPropagation()}
                    placeholder="--"
                    spellCheck={false}
                  />
                </td>
                <td>
                  <input
                    className={styles.cellInput}
                    type="password"
                    value={p.password ?? ''}
                    onChange={e => onUpdate(p.id, { password: e.target.value || null })}
                    onClick={e => e.stopPropagation()}
                    placeholder="--"
                  />
                </td>
                <td className={styles.statusCell}><StatusBadge status={p.result?.status} /></td>
                <td className={styles.mono}>
                  {p.result?.latency_ms != null ? `${p.result.latency_ms}ms` : '--'}
                </td>
                <td className={styles.mono}>{formatSpeed(p.result?.download_speed_mbps)}</td>
                <td className={styles.geoCell}>
                  {p.result?.country ? `${p.result.country}` : '--'}
                </td>
                <td className={styles.anonCell}><AnonymityBadge level={p.result?.anonymity} /></td>
                <td className={styles.actionsCell}>
                  <button
                    className={styles.copyBtn}
                    onClick={e => {
                      e.stopPropagation();
                      const auth = p.username && p.password ? `${p.username}:${p.password}@` : '';
                      navigator.clipboard.writeText(`${p.proxy_type}://${auth}${p.host}:${p.port}`);
                    }}
                    title="Copy proxy"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </button>
                  <button
                    className={styles.removeBtn}
                    onClick={e => { e.stopPropagation(); onRemove(p.id); }}
                    title="Remove"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </td>
              </tr>
              {expandedId === p.id && p.result && (
                <tr key={`${p.id}-exp`} className={styles.expandedRow}>
                  <td colSpan={11}>
                    <div className={styles.expandedContent}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Real IP</span>
                        <span className={styles.detailValue}>{p.result.real_ip ?? 'N/A'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Country</span>
                        <span className={styles.detailValue}>{p.result.country ?? 'N/A'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>City</span>
                        <span className={styles.detailValue}>{p.result.city ?? 'N/A'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Anonymity</span>
                        <span className={styles.detailValue}>{p.result.anonymity}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Latency</span>
                        <span className={styles.detailValue}>{p.result.latency_ms != null ? `${p.result.latency_ms} ms` : 'N/A'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Speed</span>
                        <span className={styles.detailValue}>{formatSpeed(p.result.download_speed_mbps)}</span>
                      </div>
                      {p.result.error && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Error</span>
                          <span className={styles.detailError}>{p.result.error}</span>
                        </div>
                      )}
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Checked</span>
                        <span className={styles.detailValue}>{p.result.checked_at ? new Date(p.result.checked_at).toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {proxies.length === 0 && (
        <div className={styles.empty}>
          No proxies added. Click "Add" or "Add Single" to get started.
        </div>
      )}
    </div>
  );
}
