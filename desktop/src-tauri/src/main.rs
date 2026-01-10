// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::{
    start_recording, 
    stop_recording, 
    get_recording_status,
    download_app_assets,
    get_assets_path,
    check_assets_installed,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            get_recording_status,
            download_app_assets,
            get_assets_path,
            check_assets_installed,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

