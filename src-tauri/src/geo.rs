use maxminddb::{geoip2, Reader};
use std::net::IpAddr;
use std::sync::OnceLock;

static GEO_READER: OnceLock<Option<Reader<Vec<u8>>>> = OnceLock::new();

pub fn init_geo_db(db_path: &str) {
    GEO_READER.get_or_init(|| {
        Reader::open_readfile(db_path).ok()
    });
}

pub struct GeoInfo {
    pub country: Option<String>,
    pub city: Option<String>,
}

pub fn lookup_ip(ip_str: &str) -> GeoInfo {
    let reader = match GEO_READER.get() {
        Some(Some(r)) => r,
        _ => return GeoInfo { country: None, city: None },
    };

    let ip: IpAddr = match ip_str.parse() {
        Ok(ip) => ip,
        Err(_) => return GeoInfo { country: None, city: None },
    };

    let city_result: Result<geoip2::City, _> = reader.lookup(ip);
    match city_result {
        Ok(city) => {
            let country = city
                .country
                .and_then(|c| c.names)
                .and_then(|n| n.get("en").map(|s| s.to_string()));

            let city_name = city
                .city
                .and_then(|c| c.names)
                .and_then(|n| n.get("en").map(|s| s.to_string()));

            GeoInfo {
                country,
                city: city_name,
            }
        }
        Err(_) => GeoInfo { country: None, city: None },
    }
}
