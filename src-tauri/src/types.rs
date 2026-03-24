use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProxyType {
    Http,
    Socks5,
    Socks5h,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AnonymityLevel {
    Transparent,
    Anonymous,
    Elite,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProxyStatus {
    Pending,
    Checking,
    Alive,
    Dead,
    DestinationUnreachable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyEntry {
    pub id: String,
    pub proxy_type: ProxyType,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyResult {
    pub id: String,
    pub status: ProxyStatus,
    pub latency_ms: Option<u64>,
    pub download_speed_mbps: Option<f64>,
    pub real_ip: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub anonymity: AnonymityLevel,
    pub error: Option<String>,
    pub checked_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndpointResponse {
    pub ip: String,
    pub headers: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckConfig {
    pub destination_url: String,
    pub max_threads: usize,
    pub connection_timeout_secs: u64,
    pub request_timeout_secs: u64,
    pub check_endpoint_url: Option<String>,
}

impl Default for CheckConfig {
    fn default() -> Self {
        Self {
            destination_url: "https://www.google.com".to_string(),
            max_threads: 10,
            connection_timeout_secs: 5,
            request_timeout_secs: 10,
            check_endpoint_url: None,
        }
    }
}
