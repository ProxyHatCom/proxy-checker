use crate::chrome::build_chrome_headers;
use crate::geo;
use crate::types::*;
use reqwest::Proxy;
use std::time::{Duration, Instant};
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::Semaphore;
use std::sync::Arc;
use tauri::Emitter;

pub(crate) static ABORT_FLAG: AtomicBool = AtomicBool::new(false);

pub(crate) fn request_stop() {
    ABORT_FLAG.store(true, Ordering::SeqCst);
}

fn is_stopped() -> bool {
    ABORT_FLAG.load(Ordering::SeqCst)
}

fn build_proxy_url(entry: &ProxyEntry) -> String {
    // Always use socks5h for SOCKS5 proxies so DNS is resolved by the proxy
    let scheme = match entry.proxy_type {
        ProxyType::Http => "http",
        ProxyType::Socks5 | ProxyType::Socks5h => "socks5h",
    };

    let host_port = if entry.host.contains(':') {
        format!("[{}]:{}", entry.host, entry.port) // IPv6
    } else {
        format!("{}:{}", entry.host, entry.port)
    };

    match (&entry.username, &entry.password) {
        (Some(user), Some(pass)) if !user.is_empty() => {
            // URL-encode credentials to handle special characters like @ : /
            let encoded_user = urlencoding::encode(user);
            let encoded_pass = urlencoding::encode(pass);
            format!("{}://{}:{}@{}", scheme, encoded_user, encoded_pass, host_port)
        }
        _ => format!("{}://{}", scheme, host_port),
    }
}

/// Redact password from proxy URL for safe logging
fn sanitize_proxy_url(url: &str) -> String {
    // Match pattern scheme://user:pass@host → scheme://user:***@host
    if let Some(at_pos) = url.rfind('@') {
        if let Some(scheme_end) = url.find("://") {
            let after_scheme = &url[scheme_end + 3..at_pos];
            if let Some(colon) = after_scheme.find(':') {
                let user = &after_scheme[..colon];
                return format!("{}://{}:***@{}", &url[..scheme_end], user, &url[at_pos + 1..]);
            }
        }
    }
    url.to_string()
}

fn build_client(
    entry: &ProxyEntry,
    config: &CheckConfig,
) -> Result<reqwest::Client, reqwest::Error> {
    let proxy_url = build_proxy_url(entry);

    let proxy = Proxy::all(&proxy_url)?;

    reqwest::Client::builder()
        .proxy(proxy)
        .connect_timeout(std::time::Duration::from_secs(config.connection_timeout_secs))
        .timeout(std::time::Duration::from_secs(config.request_timeout_secs))
        .redirect(reqwest::redirect::Policy::limited(3))
        .danger_accept_invalid_certs(false)
        .build()
}

async fn check_endpoint(
    client: &reqwest::Client,
    endpoint_url: &str,
    headers: &reqwest::header::HeaderMap,
) -> Result<EndpointResponse, String> {
    let resp = client
        .get(endpoint_url)
        .headers(headers.clone())
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("Endpoint returned HTTP {}", status.as_u16()));
    }

    resp.json::<EndpointResponse>()
        .await
        .map_err(|e| e.to_string())
}

fn determine_anonymity(headers: &std::collections::HashMap<String, String>) -> AnonymityLevel {
    let header_keys: Vec<String> = headers.keys().map(|k| k.to_lowercase()).collect();

    let has_forwarded_for = header_keys.iter().any(|k| {
        k == "x-forwarded-for" || k == "x-real-ip" || k == "x-client-ip"
            || k == "x-originating-ip" || k == "forwarded"
    });

    let has_via = header_keys.iter().any(|k| k == "via" || k == "x-proxy-id");

    if has_forwarded_for {
        AnonymityLevel::Transparent
    } else if has_via {
        AnonymityLevel::Anonymous
    } else {
        AnonymityLevel::Elite
    }
}

async fn check_destination(
    client: &reqwest::Client,
    url: &str,
    max_bytes: usize,
    headers: &reqwest::header::HeaderMap,
    timeout_secs: u64,
) -> Result<(u64, f64), String> {
    let fut = async {
        let start = Instant::now();

        let resp = client
            .get(url)
            .headers(headers.clone())
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = resp.status();
        if !status.is_success() {
            return Err(format!("Destination returned HTTP {}", status.as_u16()));
        }

        let latency = start.elapsed().as_millis() as u64;

        // Stream body with size cap instead of downloading everything
        let download_start = Instant::now();
        let mut total_bytes: usize = 0;
        let mut stream = resp;

        // Read chunks up to max_bytes
        while total_bytes < max_bytes {
            let chunk = stream.chunk().await.map_err(|e| e.to_string())?;
            match chunk {
                Some(data) => total_bytes += data.len(),
                None => break,
            }
        }

        let download_duration = download_start.elapsed().as_secs_f64();
        let speed_mbps = if download_duration > 0.001 {
            (total_bytes.min(max_bytes) as f64 / 1_000_000.0) / download_duration
        } else {
            0.0
        };

        Ok((latency, speed_mbps))
    };

    tokio::time::timeout(Duration::from_secs(timeout_secs), fut)
        .await
        .map_err(|_| "Destination check timed out".to_string())?
}

pub async fn check_single_proxy(
    entry: &ProxyEntry,
    config: &CheckConfig,
) -> ProxyResult {
    let now = chrono::Utc::now().to_rfc3339();
    let safe_url = sanitize_proxy_url(&build_proxy_url(entry));
    eprintln!("[checker] Starting check for {} ({})", safe_url, entry.id);

    let client = match build_client(entry, config) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[checker] Failed to create client: {}", e);
            return ProxyResult {
                id: entry.id.clone(),
                status: ProxyStatus::Dead,
                latency_ms: None,
                download_speed_mbps: None,
                real_ip: None,
                country: None,
                city: None,
                anonymity: AnonymityLevel::Unknown,
                error: Some(format!("Failed to create client: {}", e)),
                checked_at: Some(now),
            };
        }
    };

    let headers = match tokio::time::timeout(Duration::from_secs(8), build_chrome_headers()).await {
        Ok(h) => h,
        Err(_) => {
            eprintln!("[checker] Chrome headers fetch timed out, using defaults");
            crate::chrome::build_default_headers()
        }
    };

    // Step 1: Check endpoint (if configured)
    let mut real_ip = None;
    let mut country = None;
    let mut city = None;
    let mut anonymity = AnonymityLevel::Unknown;

    if let Some(ref endpoint_url) = config.check_endpoint_url {
        let endpoint_fut = check_endpoint(&client, endpoint_url, &headers);
        match tokio::time::timeout(Duration::from_secs(config.request_timeout_secs), endpoint_fut).await {
            Err(_) => {
                eprintln!("[checker] Endpoint timed out for {}", entry.id);
                return ProxyResult {
                    id: entry.id.clone(),
                    status: ProxyStatus::Dead,
                    latency_ms: None,
                    download_speed_mbps: None,
                    real_ip: None,
                    country: None,
                    city: None,
                    anonymity: AnonymityLevel::Unknown,
                    error: Some("Endpoint check timed out".to_string()),
                    checked_at: Some(now),
                };
            }
            Ok(Err(e)) => {
                eprintln!("[checker] Endpoint failed for {}: {}", entry.id, e);
                return ProxyResult {
                    id: entry.id.clone(),
                    status: ProxyStatus::Dead,
                    latency_ms: None,
                    download_speed_mbps: None,
                    real_ip: None,
                    country: None,
                    city: None,
                    anonymity: AnonymityLevel::Unknown,
                    error: Some(format!("Endpoint check failed: {}", e)),
                    checked_at: Some(now),
                };
            }
            Ok(Ok(resp)) => {
                real_ip = Some(resp.ip.clone());
                anonymity = determine_anonymity(&resp.headers);

                let geo_info = geo::lookup_ip(&resp.ip);
                country = geo_info.country;
                city = geo_info.city;
            }
        }
    }

    // Step 2: Check destination URL
    match check_destination(&client, &config.destination_url, config.max_download_bytes, &headers, config.request_timeout_secs).await {
        Ok((latency, speed)) => {
            ProxyResult {
                id: entry.id.clone(),
                status: ProxyStatus::Alive,
                latency_ms: Some(latency),
                download_speed_mbps: Some(speed),
                real_ip,
                country,
                city,
                anonymity,
                error: None,
                checked_at: Some(now),
            }
        },
        Err(e) => {
            // If endpoint worked but destination failed
            let status = if real_ip.is_some() {
                ProxyStatus::DestinationUnreachable
            } else {
                ProxyStatus::Dead
            };

            ProxyResult {
                id: entry.id.clone(),
                status,
                latency_ms: None,
                download_speed_mbps: None,
                real_ip,
                country,
                city,
                anonymity,
                error: Some(format!("Destination check failed: {}", e)),
                checked_at: Some(now),
            }
        }
    }
}

pub async fn check_proxies(
    entries: Vec<ProxyEntry>,
    config: CheckConfig,
    window: tauri::Window,
) -> Vec<ProxyResult> {
    ABORT_FLAG.store(false, Ordering::SeqCst);

    let semaphore = Arc::new(Semaphore::new(config.max_threads));
    let config = Arc::new(config);
    let mut handles = Vec::new();

    for entry in entries {
        let sem = semaphore.clone();
        let cfg = config.clone();
        let win = window.clone();

        let handle = tokio::spawn(async move {
            let _permit = match sem.acquire().await {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("[checker] Semaphore acquire failed: {}", e);
                    return None;
                }
            };

            if is_stopped() {
                return None;
            }

            // Emit "checking" status
            let _ = win.emit("proxy-status", serde_json::json!({
                "id": entry.id,
                "status": "checking"
            }));

            // Hard timeout to prevent SOCKS5 hangs
            let total_timeout = Duration::from_secs(
                cfg.connection_timeout_secs + cfg.request_timeout_secs + 10
            );

            let result = match tokio::time::timeout(total_timeout, check_single_proxy(&entry, &cfg)).await {
                Ok(r) => r,
                Err(_) => {
                    eprintln!("[checker] Hard timeout for {}", entry.id);
                    let now = chrono::Utc::now().to_rfc3339();
                    ProxyResult {
                        id: entry.id.clone(),
                        status: ProxyStatus::Dead,
                        latency_ms: None,
                        download_speed_mbps: None,
                        real_ip: None,
                        country: None,
                        city: None,
                        anonymity: AnonymityLevel::Unknown,
                        error: Some("Check timed out".to_string()),
                        checked_at: Some(now),
                    }
                }
            };

            if !is_stopped() {
                let _ = win.emit("proxy-result", &result);
            }

            Some(result)
        });

        handles.push(handle);
    }

    let mut results = Vec::new();
    for handle in handles {
        if let Ok(Some(result)) = handle.await {
            results.push(result);
        }
    }

    results
}
