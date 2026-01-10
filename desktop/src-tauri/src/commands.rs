use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Manager};
use std::path::PathBuf;

mod downloader;
use downloader::download_assets;

#[derive(Debug, Serialize, Deserialize)]
pub struct RecordingConfig {
    pub output_path: String,
    pub video_track_id: Option<String>,
    pub audio_track_id: Option<String>,
}

#[command]
pub async fn start_recording(config: RecordingConfig) -> Result<String, String> {
    // TODO: Implement FFmpeg recording
    // This will capture LiveKit tracks and mux them into MP4
    // For now, return a placeholder response
    Ok(format!("Recording started: {}", config.output_path))
}

#[command]
pub async fn stop_recording() -> Result<String, String> {
    // TODO: Stop FFmpeg recording and finalize MP4 file
    Ok("Recording stopped".to_string())
}

#[command]
pub async fn get_recording_status() -> Result<bool, String> {
    // TODO: Check if recording is in progress
    Ok(false)
}

#[command]
pub async fn download_app_assets(
    app: AppHandle,
    manifest_url: String,
) -> Result<(), String> {
    let app_data_dir = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let assets_dir = app_data_dir.join("assets");
    
    download_assets(app, manifest_url, assets_dir).await?;
    
    Ok(())
}

#[command]
pub async fn get_assets_path(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let assets_dir = app_data_dir.join("assets");
    
    Ok(assets_dir.to_string_lossy().to_string())
}

#[command]
pub async fn check_assets_installed(app: AppHandle) -> Result<bool, String> {
    let app_data_dir = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let assets_dir = app_data_dir.join("assets");
    let manifest_file = assets_dir.join("manifest.json");
    
    Ok(manifest_file.exists())
}

