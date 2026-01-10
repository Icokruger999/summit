# Stub Installer Implementation

## Overview

The Summit desktop app uses a **stub installer** pattern:
1. **Initial Download**: Small installer (5-10MB) downloads quickly
2. **Post-Install**: App checks for assets and downloads them with progress bar
3. **First Launch**: Shows download screen if assets missing

## How It Works

### 1. Build Configuration

The app is built in **stub mode** - minimal assets included:
- Core Tauri runtime
- Basic UI shell
- Asset downloader component
- No large assets bundled

### 2. Asset Manifest

Assets are defined in a JSON manifest hosted on your CDN:

```json
{
  "version": "1.0.0",
  "assets": [
    {
      "url": "https://cdn.codingeverest.com/summit/assets/ui-components.js",
      "path": "ui-components.js",
      "size": 2048576,
      "checksum": "sha256:abc123..."
    },
    {
      "url": "https://cdn.codingeverest.com/summit/assets/fonts.zip",
      "path": "fonts.zip",
      "size": 5242880,
      "checksum": "sha256:def456..."
    }
  ]
}
```

### 3. Download Flow

1. **App Launch**: Checks if assets are installed
2. **If Missing**: Shows `AssetDownloader` component
3. **Download**: Downloads all assets with progress bar
4. **Verify**: Checks SHA256 checksums
5. **Complete**: Stores assets in app data directory
6. **Continue**: Loads main app

## Setup

### 1. Environment Variable

Add to `.env`:
```env
VITE_ASSETS_MANIFEST_URL=https://your-cdn.com/summit/assets/manifest.json
```

### 2. Build Stub Installer

```bash
cd desktop
npm run tauri:build
```

This creates a minimal installer in:
- Windows: `src-tauri/target/release/bundle/msi/Summit_0.1.0_x64_en-US.msi`
- macOS: `src-tauri/target/release/bundle/macos/Summit.app`
- Linux: `src-tauri/target/release/bundle/appimage/Summit_0.1.0_amd64.AppImage`

### 3. Host Asset Manifest

Upload your asset manifest and files to a CDN:
```
https://your-cdn.com/summit/assets/
├── manifest.json
├── ui-components.js
├── fonts.zip
└── ...
```

### 4. Asset Storage

Downloaded assets are stored in:
- **Windows**: `%APPDATA%\com.codingeverest.summit\assets\`
- **macOS**: `~/Library/Application Support/com.codingeverest.summit/assets/`
- **Linux**: `~/.local/share/com.codingeverest.summit/assets/`

## Customization

### Change Manifest URL

Update in `desktop/src/App.tsx`:
```typescript
const MANIFEST_URL = "https://your-cdn.com/summit/assets/manifest.json";
```

### Add More Assets

Update your manifest.json with additional assets. The downloader will:
- Download all assets in parallel (with progress)
- Verify checksums
- Store in app data directory

### Skip Download in Development

Assets check is automatically skipped in browser mode. In Tauri dev mode, you can:
1. Pre-create assets directory
2. Or handle the error gracefully (already implemented)

## Benefits

✅ **Fast Initial Download**: 5-10MB vs 50-100MB+  
✅ **Better UX**: Progress bar shows what's happening  
✅ **Updateable Assets**: Update assets without new installer  
✅ **Bandwidth Efficient**: Only download what's needed  
✅ **Verifiable**: SHA256 checksums ensure integrity  

## Production Checklist

- [ ] Set `VITE_ASSETS_MANIFEST_URL` in production build
- [ ] Host manifest.json on CDN
- [ ] Upload all asset files to CDN
- [ ] Test stub installer download
- [ ] Verify checksums work
- [ ] Test on Windows, macOS, Linux
- [ ] Monitor download success rates

