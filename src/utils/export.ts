import { ProxyRow } from '../types/proxy';

function proxyToUri(p: ProxyRow): string {
  const scheme = p.proxy_type === 'http' ? 'http' : 'socks5';
  const auth = p.username && p.password ? `${p.username}:${p.password}@` : '';
  return `${scheme}://${auth}${p.host}:${p.port}`;
}

export function copyToClipboard(proxies: ProxyRow[]): void {
  const text = proxies.map(proxyToUri).join('\n');
  navigator.clipboard.writeText(text);
}

export function exportTxt(proxies: ProxyRow[]): void {
  const text = proxies.map(proxyToUri).join('\n');
  downloadFile(text, 'proxies.txt', 'text/plain');
}

export function exportCsv(proxies: ProxyRow[]): void {
  const headers = ['Type', 'Host', 'Port', 'Username', 'Password', 'Status', 'Latency (ms)', 'Speed (MB/s)', 'Real IP', 'Country', 'City', 'Anonymity'];
  const rows = proxies.map(p => [
    p.proxy_type,
    p.host,
    p.port,
    p.username ?? '',
    p.password ?? '',
    p.result?.status ?? 'pending',
    p.result?.latency_ms ?? '',
    p.result?.download_speed_mbps?.toFixed(2) ?? '',
    p.result?.real_ip ?? '',
    p.result?.country ?? '',
    p.result?.city ?? '',
    p.result?.anonymity ?? 'unknown',
  ]);

  const csv = [headers, ...rows].map(row =>
    row.map(cell => {
      const str = String(cell);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  ).join('\n');

  // BOM for Excel UTF-8 compatibility
  downloadFile('\uFEFF' + csv, 'proxies.csv', 'text/csv;charset=utf-8');
}

function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
