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

/** Strip BOM, zero-width chars, and other invisible Unicode junk from pasted text */
function sanitize(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF\u00A0\u2060]/g, '').trim();
}

export function parseProxyList(text: string): ParsedProxy[] {
  // Normalize line endings, split, clean each line
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const results: ParsedProxy[] = [];

  for (const raw of lines) {
    const line = sanitize(raw);
    if (!line) continue;
    const parsed = parseSingleProxy(line);
    if (parsed) results.push(parsed);
  }

  return results;
}

function parseScheme(scheme: string): ProxyType {
  const s = scheme.toLowerCase();
  if (s === 'socks5') return 'socks5';
  if (s === 'socks5h') return 'socks5h';
  return 'http';
}

function parseSingleProxy(line: string): ParsedProxy | null {
  // Strip trailing comments (only if # is preceded by whitespace)
  const commentIdx = line.search(/\s+#/);
  const cleanLine = commentIdx >= 0 ? line.slice(0, commentIdx).trim() : line;
  if (!cleanLine) return null;

  // 1. URI format: protocol://[user:pass@]host:port
  //    Supports: http, https, socks5, socks5h
  const schemeEnd = cleanLine.indexOf('://');
  if (schemeEnd > 0) {
    const scheme = cleanLine.slice(0, schemeEnd);
    if (/^(https?|socks5h?)$/i.test(scheme)) {
      const rest = cleanLine.slice(schemeEnd + 3).replace(/\/+$/, ''); // strip trailing slashes
      let user: string | null = null;
      let pass: string | null = null;
      let hostPort: string;

      const atIdx = rest.lastIndexOf('@');
      if (atIdx >= 0) {
        const authPart = rest.slice(0, atIdx);
        hostPort = rest.slice(atIdx + 1);
        const colonIdx = authPart.indexOf(':');
        if (colonIdx >= 0) {
          user = decodeURIComponent(authPart.slice(0, colonIdx));
          pass = decodeURIComponent(authPart.slice(colonIdx + 1));
        } else {
          user = decodeURIComponent(authPart);
        }
      } else {
        hostPort = rest;
      }

      const lastColon = hostPort.lastIndexOf(':');
      if (lastColon >= 0) {
        const host = hostPort.slice(0, lastColon);
        const port = parseInt(hostPort.slice(lastColon + 1), 10);
        if (host && isValidPort(port)) {
          return { proxy_type: parseScheme(scheme), host, port, username: user, password: pass };
        }
      }
    }
  }

  // 2. user:pass@host:port (no scheme)
  const atIdx = cleanLine.lastIndexOf('@');
  if (atIdx > 0) {
    const authPart = cleanLine.slice(0, atIdx);
    const hostPort = cleanLine.slice(atIdx + 1);
    const lastColon = hostPort.lastIndexOf(':');
    if (lastColon >= 0) {
      const host = hostPort.slice(0, lastColon);
      const port = parseInt(hostPort.slice(lastColon + 1), 10);
      const colonIdx = authPart.indexOf(':');
      if (host && isValidPort(port) && colonIdx >= 0) {
        return {
          proxy_type: 'http',
          host,
          port,
          username: authPart.slice(0, colonIdx),
          password: authPart.slice(colonIdx + 1),
        };
      }
    }
  }

  // 3. Bracketed IPv6: [::1]:port or [::1]:port:user:pass
  if (cleanLine.startsWith('[')) {
    const bracketEnd = cleanLine.indexOf(']');
    if (bracketEnd > 1 && cleanLine[bracketEnd + 1] === ':') {
      const host = cleanLine.slice(1, bracketEnd);
      const afterBracket = cleanLine.slice(bracketEnd + 2);
      const colonParts = afterBracket.split(':');
      const port = parseInt(colonParts[0], 10);
      if (isValidPort(port)) {
        if (colonParts.length >= 3) {
          return { proxy_type: 'http', host, port, username: colonParts[1], password: colonParts.slice(2).join(':') };
        }
        return { proxy_type: 'http', host, port, username: null, password: null };
      }
    }
  }

  // 5. host:port:user:pass — split by : and check second element is a valid port
  const parts = cleanLine.split(':');
  if (parts.length >= 4) {
    const port = parseInt(parts[1], 10);
    if (isValidPort(port)) {
      return {
        proxy_type: 'http',
        host: parts[0],
        port,
        username: parts[2],
        password: parts.slice(3).join(':'), // password may contain colons
      };
    }
  }

  // 6. host:port
  if (parts.length === 2) {
    const port = parseInt(parts[1], 10);
    if (isValidPort(port)) {
      return { proxy_type: 'http', host: parts[0], port, username: null, password: null };
    }
  }

  return null;
}
