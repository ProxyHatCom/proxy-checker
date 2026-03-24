export type ProxyType = 'http' | 'socks5' | 'socks5h';
export type ProxyStatus = 'pending' | 'checking' | 'alive' | 'dead' | 'destinationunreachable';
export type AnonymityLevel = 'transparent' | 'anonymous' | 'elite' | 'unknown';

export interface ProxyEntry {
  id: string;
  proxy_type: ProxyType;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
}

export interface ProxyResult {
  id: string;
  status: ProxyStatus;
  latency_ms: number | null;
  download_speed_mbps: number | null;
  real_ip: string | null;
  country: string | null;
  city: string | null;
  anonymity: AnonymityLevel;
  error: string | null;
  checked_at: string | null;
}

export interface CheckConfig {
  destination_url: string;
  max_threads: number;
  connection_timeout_secs: number;
  request_timeout_secs: number;
  check_endpoint_url: string | null;
}

export interface ProxyRow extends ProxyEntry {
  result?: ProxyResult;
}
