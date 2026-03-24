import { ProxyType } from '../types/proxy';

interface ParsedProxy {
  proxy_type: ProxyType;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
}

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function parseProxyList(text: string): ParsedProxy[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: ParsedProxy[] = [];

  for (const line of lines) {
    const parsed = parseSingleProxy(line);
    if (parsed) results.push(parsed);
  }

  return results;
}

function parseSingleProxy(line: string): ParsedProxy | null {
  // Remove comments
  const cleanLine = line.split('#')[0].trim();
  if (!cleanLine) return null;

  // Try URI format: socks5://user:pass@host:port or http://host:port
  const uriMatch = cleanLine.match(
    /^(https?|socks5h?):\/\/(?:([^:@]+):([^@]+)@)?([^:\/]+):(\d+)\/?$/i
  );
  if (uriMatch) {
    const port = parseInt(uriMatch[5], 10);
    if (!isValidPort(port)) return null;

    const scheme = uriMatch[1].toLowerCase();
    let proxyType: ProxyType = 'http';
    if (scheme === 'socks5') proxyType = 'socks5';
    else if (scheme === 'socks5h') proxyType = 'socks5h';

    return {
      proxy_type: proxyType,
      host: uriMatch[4],
      port,
      username: uriMatch[2] || null,
      password: uriMatch[3] || null,
    };
  }

  // Try user:pass@host:port
  const authAtMatch = cleanLine.match(/^([^:@]+):([^@]+)@([^:]+):(\d+)$/);
  if (authAtMatch) {
    const port = parseInt(authAtMatch[4], 10);
    if (!isValidPort(port)) return null;

    return {
      proxy_type: 'http',
      host: authAtMatch[3],
      port,
      username: authAtMatch[1],
      password: authAtMatch[2],
    };
  }

  // Try host:port:user:pass
  const parts = cleanLine.split(':');
  if (parts.length === 4) {
    const port = parseInt(parts[1], 10);
    if (isValidPort(port)) {
      return {
        proxy_type: 'http',
        host: parts[0],
        port,
        username: parts[2],
        password: parts[3],
      };
    }
  }

  // Try host:port
  if (parts.length === 2) {
    const port = parseInt(parts[1], 10);
    if (isValidPort(port)) {
      return {
        proxy_type: 'http',
        host: parts[0],
        port,
        username: null,
        password: null,
      };
    }
  }

  return null;
}
