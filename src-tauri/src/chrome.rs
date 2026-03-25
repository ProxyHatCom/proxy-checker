use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::Deserialize;
use std::sync::OnceLock;
use tokio::sync::Mutex;

static CHROME_VERSION: OnceLock<Mutex<ChromeVersionCache>> = OnceLock::new();

struct ChromeVersionCache {
    version: String,
    major: String,
    fetched_at: Option<std::time::Instant>,
}

const FALLBACK_VERSION: &str = "134.0.6998.89";
const FALLBACK_MAJOR: &str = "134";
const CACHE_DURATION_SECS: u64 = 86400; // 24 hours

#[derive(Deserialize)]
struct VersionResponse {
    versions: Vec<VersionEntry>,
}

#[derive(Deserialize)]
struct VersionEntry {
    version: String,
}

pub async fn get_chrome_version() -> (String, String) {
    let cache = CHROME_VERSION.get_or_init(|| {
        Mutex::new(ChromeVersionCache {
            version: FALLBACK_VERSION.to_string(),
            major: FALLBACK_MAJOR.to_string(),
            fetched_at: None, // None = never fetched, will trigger fetch
        })
    });

    // Check cache under lock, release before network call
    let (needs_fetch, current) = {
        let guard = cache.lock().await;
        let needs = match guard.fetched_at {
            Some(t) => t.elapsed().as_secs() >= CACHE_DURATION_SECS,
            None => true,
        };
        (needs, (guard.version.clone(), guard.major.clone()))
    };

    if !needs_fetch {
        return current;
    }

    // Fetch without holding the lock — other tasks use fallback/cached version
    match fetch_latest_chrome_version().await {
        Ok((version, major)) => {
            let mut guard = cache.lock().await;
            guard.version = version.clone();
            guard.major = major.clone();
            guard.fetched_at = Some(std::time::Instant::now());
            (version, major)
        }
        Err(_) => current,
    }
}

async fn fetch_latest_chrome_version() -> Result<(String, String), Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()?;

    let resp = client
        .get("https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions")
        .send()
        .await?
        .json::<VersionResponse>()
        .await?;

    if let Some(entry) = resp.versions.first() {
        let major = entry.version.split('.').next().unwrap_or(FALLBACK_MAJOR).to_string();
        Ok((entry.version.clone(), major))
    } else {
        Ok((FALLBACK_VERSION.to_string(), FALLBACK_MAJOR.to_string()))
    }
}

/// Build headers with hardcoded fallback version (no async, no network)
pub fn build_default_headers() -> HeaderMap {
    build_headers_with(FALLBACK_VERSION, FALLBACK_MAJOR)
}

pub async fn build_chrome_headers() -> HeaderMap {
    let (version, major) = get_chrome_version().await;
    build_headers_with(&version, &major)
}

fn build_headers_with(version: &str, major: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();

    // Order matters -- matches real Chrome header order
    headers.insert(
        HeaderName::from_static("sec-ch-ua"),
        HeaderValue::from_str(&format!(
            "\"Chromium\";v=\"{major}\", \"Google Chrome\";v=\"{major}\", \"Not-A.Brand\";v=\"99\""
        ))
        .unwrap_or_else(|_| HeaderValue::from_static("")),
    );
    headers.insert(
        HeaderName::from_static("sec-ch-ua-mobile"),
        HeaderValue::from_static("?0"),
    );
    headers.insert(
        HeaderName::from_static("sec-ch-ua-platform"),
        HeaderValue::from_static("\"Windows\""),
    );
    headers.insert(
        HeaderName::from_static("upgrade-insecure-requests"),
        HeaderValue::from_static("1"),
    );
    headers.insert(
        reqwest::header::USER_AGENT,
        HeaderValue::from_str(&format!(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Safari/537.36"
        ))
        .unwrap_or_else(|_| HeaderValue::from_static("")),
    );
    headers.insert(
        reqwest::header::ACCEPT,
        HeaderValue::from_static(
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        ),
    );
    headers.insert(
        HeaderName::from_static("sec-fetch-site"),
        HeaderValue::from_static("none"),
    );
    headers.insert(
        HeaderName::from_static("sec-fetch-mode"),
        HeaderValue::from_static("navigate"),
    );
    headers.insert(
        HeaderName::from_static("sec-fetch-user"),
        HeaderValue::from_static("?1"),
    );
    headers.insert(
        HeaderName::from_static("sec-fetch-dest"),
        HeaderValue::from_static("document"),
    );
    headers.insert(
        reqwest::header::ACCEPT_ENCODING,
        HeaderValue::from_static("gzip, deflate, br"),
    );
    headers.insert(
        reqwest::header::ACCEPT_LANGUAGE,
        HeaderValue::from_static("en-US,en;q=0.9"),
    );
    headers.insert(
        reqwest::header::CONNECTION,
        HeaderValue::from_static("keep-alive"),
    );

    headers
}
