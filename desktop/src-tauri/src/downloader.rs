use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadProgress {
    pub current: u64,
    pub total: u64,
    pub percentage: f64,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssetManifest {
    pub version: String,
    pub assets: Vec<AssetInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssetInfo {
    pub url: String,
    pub path: String,
    pub size: u64,
    pub checksum: Option<String>,
}

// Download assets with progress reporting
pub async fn download_assets(
    app: AppHandle,
    manifest_url: String,
    base_path: PathBuf,
) -> Result<(), String> {
    // Emit initial status
    let _ = app.emit_all("download-progress", DownloadProgress {
        current: 0,
        total: 0,
        percentage: 0.0,
        status: "Fetching asset manifest...".to_string(),
    });

    // Download manifest using Tauri's HTTP
    let manifest = fetch_manifest(&manifest_url).await?;
    
    let total_size: u64 = manifest.assets.iter().map(|a| a.size).sum();
    let mut downloaded: u64 = 0;

    let _ = app.emit_all("download-progress", DownloadProgress {
        current: 0,
        total: total_size,
        percentage: 0.0,
        status: format!("Downloading {} assets...", manifest.assets.len()),
    });

    // Create base directory
    fs::create_dir_all(&base_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    // Download each asset
    for (index, asset) in manifest.assets.iter().enumerate() {
        let asset_path = base_path.join(&asset.path);
        
        // Create parent directory if needed
        if let Some(parent) = asset_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        // Download asset
        let _ = app.emit_all("download-progress", DownloadProgress {
            current: downloaded,
            total: total_size,
            percentage: if total_size > 0 { (downloaded as f64 / total_size as f64) * 100.0 } else { 0.0 },
            status: format!("Downloading {} ({}/{})...", 
                asset.path, index + 1, manifest.assets.len()),
        });

        download_file(&asset.url, &asset_path).await?;
        downloaded += asset.size;

        // Verify checksum if provided
        if let Some(expected_checksum) = &asset.checksum {
            verify_checksum(&asset_path, expected_checksum)?;
        }
    }

    // Complete
    let _ = app.emit_all("download-progress", DownloadProgress {
        current: total_size,
        total: total_size,
        percentage: 100.0,
        status: "Download complete!".to_string(),
    });

    Ok(())
}

async fn fetch_manifest(url: &str) -> Result<AssetManifest, String> {
    // Use reqwest for HTTP requests
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to fetch manifest: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch manifest: HTTP {}", response.status()));
    }

    let manifest: AssetManifest = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;

    Ok(manifest)
}

async fn download_file(url: &str, path: &PathBuf) -> Result<(), String> {
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to download {}: {}", url, e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to download {}: HTTP {}", url, response.status()));
    }

    let mut file = fs::File::create(path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let bytes = response.bytes().await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

fn verify_checksum(path: &PathBuf, expected: &str) -> Result<(), String> {
    use sha2::{Sha256, Digest};
    
    let data = fs::read(path)
        .map_err(|e| format!("Failed to read file for checksum: {}", e))?;
    
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let hash = format!("{:x}", hasher.finalize());
    
    // Remove "sha256:" prefix if present
    let expected_clean = expected.strip_prefix("sha256:").unwrap_or(expected);
    
    if hash != expected_clean {
        return Err(format!("Checksum mismatch for {}: expected {}, got {}", 
            path.display(), expected_clean, hash));
    }
    
    Ok(())
}
