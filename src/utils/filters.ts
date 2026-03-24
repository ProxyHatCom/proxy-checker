import { ProxyRow, ProxyType, ProxyStatus, AnonymityLevel } from '../types/proxy';

export interface FilterState {
  status: 'all' | ProxyStatus;
  latency: 'all' | 'fast' | 'medium' | 'slow';
  type: 'all' | ProxyType;
  country: string;
  anonymity: 'all' | AnonymityLevel;
}

export const defaultFilters: FilterState = {
  status: 'all',
  latency: 'all',
  type: 'all',
  country: '',
  anonymity: 'all',
};

export function applyFilters(proxies: ProxyRow[], filters: FilterState): ProxyRow[] {
  return proxies.filter(p => {
    // Status filter
    if (filters.status !== 'all') {
      const status = p.result?.status ?? 'pending';
      if (status !== filters.status) return false;
    }

    // Latency filter
    if (filters.latency !== 'all' && p.result?.latency_ms != null) {
      const ms = p.result.latency_ms;
      if (filters.latency === 'fast' && ms >= 200) return false;
      if (filters.latency === 'medium' && (ms < 200 || ms >= 500)) return false;
      if (filters.latency === 'slow' && ms < 500) return false;
    }

    // Type filter
    if (filters.type !== 'all' && p.proxy_type !== filters.type) return false;

    // Country filter
    if (filters.country && p.result?.country) {
      if (!p.result.country.toLowerCase().includes(filters.country.toLowerCase())) return false;
    } else if (filters.country && !p.result?.country) {
      return false;
    }

    // Anonymity filter
    if (filters.anonymity !== 'all') {
      const anon = p.result?.anonymity ?? 'unknown';
      if (anon !== filters.anonymity) return false;
    }

    return true;
  });
}
