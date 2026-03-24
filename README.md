# ProxyHat Checker

Free open-source desktop proxy checker. Test SOCKS5 and HTTP proxies for status, latency, download speed, geolocation, and anonymity level.

Built by [ProxyHat](https://proxyhat.com) — residential & mobile proxy provider.

## Features

- SOCKS5 / SOCKS5h / HTTP proxy support
- Real IP detection via dedicated check endpoint
- Latency and download speed measurement
- GeoIP lookup (country & city) via MaxMind GeoLite2
- Anonymity level detection (Elite / Anonymous / Transparent)
- Chrome header emulation for accurate testing
- Concurrent checking with configurable thread count
- Bulk import — paste proxy lists in any format
- Export results as CSV, TXT, or clipboard
- Sortable & filterable results table
- Light & dark theme
- Auto-updates

## Supported Proxy Formats

```
socks5://user:pass@host:port
http://host:port
user:pass@host:port
host:port:user:pass
host:port
```

## Download

Go to [Releases](https://github.com/ProxyHatCom/proxy-checker/releases) and download the installer for your platform:

- **Windows** — `.exe` / `.msi`
- **macOS** — `.dmg`
- **Linux** — `.AppImage` / `.deb`

## Tech Stack

- **Frontend** — React 19, TypeScript, CSS Modules
- **Backend** — Rust, Tauri 2
- **Networking** — reqwest with SOCKS5 support
- **GeoIP** — MaxMind GeoLite2 (bundled)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

> **Note:** Building requires the [GeoLite2-City.mmdb](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data) database in `src-tauri/resources/`.

## License

MIT
