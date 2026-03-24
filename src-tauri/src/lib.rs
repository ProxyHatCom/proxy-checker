mod checker;
mod chrome;
mod geo;
mod types;

use tauri::Manager;
use types::*;

#[tauri::command]
async fn check_all_proxies(
    entries: Vec<ProxyEntry>,
    config: CheckConfig,
    window: tauri::Window,
) -> Result<Vec<ProxyResult>, String> {
    Ok(checker::check_proxies(entries, config, window).await)
}

#[tauri::command]
async fn check_single(
    entry: ProxyEntry,
    config: CheckConfig,
) -> Result<ProxyResult, String> {
    Ok(checker::check_single_proxy(&entry, &config).await)
}

#[tauri::command]
async fn get_chrome_version() -> Result<(String, String), String> {
    Ok(chrome::get_chrome_version().await)
}

#[tauri::command]
fn stop_checking() {
    checker::request_stop();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Try to load GeoIP database
            // In dev mode, check src-tauri/resources/ directly
            // In production, check the bundled resource dir
            let resource_dir = app.path().resource_dir().unwrap_or_default();
            let db_path = resource_dir.join("resources").join("GeoLite2-City.mmdb");

            let db_path = if db_path.exists() {
                db_path
            } else {
                // Fallback: look relative to the executable (dev mode)
                let exe_dir = std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                    .unwrap_or_default();
                let dev_path = exe_dir.join("../resources/GeoLite2-City.mmdb");
                if dev_path.exists() {
                    dev_path
                } else {
                    // Try src-tauri/resources/ for dev mode
                    std::path::PathBuf::from("resources/GeoLite2-City.mmdb")
                }
            };

            if let Some(path_str) = db_path.to_str() {
                geo::init_geo_db(path_str);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_all_proxies,
            check_single,
            get_chrome_version,
            stop_checking,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
