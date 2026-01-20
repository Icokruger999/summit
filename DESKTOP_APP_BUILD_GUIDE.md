# Summit Desktop App - Build & Distribution Guide

## Overview

The Summit desktop app is built using **Tauri**, which wraps the React web app in a native desktop application. It provides:

✅ Native OS notifications (work when app is closed)
✅ System tray integration
✅ Better performance
✅ Auto-start capability
✅ Smaller file size than Electron
✅ Same codebase as web app

## Prerequisites

### 1. Install Rust
Tauri requires Rust to build native apps.

**Windows:**
```bash
# Download and run rustup-init.exe from:
https://rustup.rs/

# Or use winget:
winget install Rustlang.Rustup
```

**macOS:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Linux:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Install System Dependencies

**Windows:**
- Visual Studio C++ Build Tools
- WebView2 (usually pre-installed on Windows 10/11)

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### 3. Install Node.js Dependencies
```bash
cd summit/desktop
npm install
```

## Building the Desktop App

### Development Mode (Test Locally)
```bash
cd summit/desktop
npm run tauri:dev
```

This will:
1. Start the Vite dev server
2. Launch the Tauri app window
3. Hot-reload on code changes
4. Show console logs in terminal

### Production Build
```bash
cd summit/desktop
npm run tauri:build
```

This will:
1. Build the React app (optimized production build)
2. Compile the Rust backend
3. Create platform-specific installers

**Build Output Locations:**

**Windows:**
- `summit/desktop/src-tauri/target/release/summit-desktop.exe` (portable)
- `summit/desktop/src-tauri/target/release/bundle/msi/Summit_1.0.0_x64_en-US.msi` (installer)
- `summit/desktop/src-tauri/target/release/bundle/nsis/Summit_1.0.0_x64-setup.exe` (NSIS installer)

**macOS:**
- `summit/desktop/src-tauri/target/release/bundle/dmg/Summit_1.0.0_x64.dmg` (installer)
- `summit/desktop/src-tauri/target/release/bundle/macos/Summit.app` (app bundle)

**Linux:**
- `summit/desktop/src-tauri/target/release/bundle/deb/summit-desktop_1.0.0_amd64.deb` (Debian/Ubuntu)
- `summit/desktop/src-tauri/target/release/bundle/appimage/summit-desktop_1.0.0_amd64.AppImage` (AppImage)
- `summit/desktop/src-tauri/target/release/bundle/rpm/summit-desktop-1.0.0-1.x86_64.rpm` (Fedora/RHEL)

## Build Times

**First Build:**
- Windows: ~10-15 minutes (Rust compilation)
- macOS: ~8-12 minutes
- Linux: ~8-12 minutes

**Subsequent Builds:**
- Windows: ~2-5 minutes (incremental compilation)
- macOS: ~2-4 minutes
- Linux: ~2-4 minutes

## Testing the Desktop App

### 1. Test Notifications
```bash
# Run in dev mode
npm run tauri:dev

# In the app:
1. Log in
2. Grant notification permissions
3. Minimize the app window
4. Have someone send you a message or call
5. Notification should appear even when minimized
```

### 2. Test Calls
```bash
# Same as web app - all call features work identically
1. Start a video call
2. Verify camera/mic work
3. Verify other user can join
4. Test camera/mic toggle during call
```

### 3. Test System Tray (Future Feature)
Currently not implemented, but can be added to allow:
- App runs in background
- Click tray icon to show/hide window
- Right-click for menu (Quit, Settings, etc.)

## Distribution

### Option 1: Direct Download (Simple)
1. Build the app: `npm run tauri:build`
2. Upload installer to your website
3. Users download and install

**Pros:**
- Simple and fast
- No app store approval needed
- Full control

**Cons:**
- Users need to trust your website
- No automatic updates (unless you implement them)
- Manual distribution

### Option 2: Microsoft Store (Windows)
1. Create Microsoft Partner Center account
2. Package app for Store
3. Submit for review
4. Users install from Store

**Pros:**
- Trusted source
- Automatic updates
- Better discoverability

**Cons:**
- $19 one-time fee for developer account
- Review process (1-3 days)
- Store policies to follow

### Option 3: Mac App Store (macOS)
1. Apple Developer account ($99/year)
2. Code signing certificate
3. App Store submission
4. Review process

**Pros:**
- Trusted source
- Automatic updates
- Best for Mac users

**Cons:**
- $99/year fee
- Strict review process
- Sandboxing requirements

### Option 4: Auto-Updater (Recommended)
Tauri has built-in auto-update support:

```rust
// In src-tauri/tauri.conf.json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://summit.codingeverest.com/updates/{{target}}/{{current_version}}"
    ],
    "dialog": true,
    "pubkey": "YOUR_PUBLIC_KEY"
  }
}
```

**Benefits:**
- Users always have latest version
- Push bug fixes instantly
- No app store needed

## Current Status

✅ **Ready to Build:**
- Tauri is configured
- All dependencies installed
- Build scripts ready

✅ **Features Working:**
- Video/audio calls (Chime SDK)
- Chat and messaging
- WebSocket real-time updates
- Camera/microphone access

⚠️ **Not Yet Implemented:**
- System tray integration
- Auto-start on boot
- Auto-updater
- Code signing (for distribution)

## Quick Start Commands

```bash
# Install dependencies
cd summit/desktop
npm install

# Test in development
npm run tauri:dev

# Build for production
npm run tauri:build

# Build output will be in:
# summit/desktop/src-tauri/target/release/bundle/
```

## Comparison: Web App vs Desktop App

| Feature | Web App | Desktop App |
|---------|---------|-------------|
| Notifications when closed | ❌ No | ✅ Yes |
| System tray | ❌ No | ✅ Yes (can add) |
| Auto-start | ❌ No | ✅ Yes (can add) |
| Installation required | ❌ No | ✅ Yes |
| Updates | ✅ Instant | ⚠️ Manual (or auto-update) |
| File size | 0 MB | ~15-30 MB |
| Platform support | All (browser) | Windows/Mac/Linux |
| Calls work | ✅ Yes | ✅ Yes |
| Performance | Good | Better |

## Recommended Approach

### Phase 1: Web App (Current)
- Users access via browser
- Works immediately, no installation
- Good for testing and early users

### Phase 2: Desktop App (Next)
- Build and distribute desktop app
- Better notifications and UX
- Recommended for power users

### Phase 3: Both (Ideal)
- Offer both web and desktop versions
- Users choose based on preference
- Same backend, same features

## Next Steps

1. **Test locally**: Run `npm run tauri:dev` to test the desktop app
2. **Build installer**: Run `npm run tauri:build` to create installer
3. **Test installer**: Install on a clean machine and test
4. **Distribute**: Upload to website or submit to app stores
5. **Add features**: System tray, auto-start, auto-update

## Support

The desktop app uses the same codebase as the web app, so:
- All bug fixes apply to both
- All new features work in both
- Maintain one codebase for both platforms

## Troubleshooting

### Build Fails on Windows
- Install Visual Studio C++ Build Tools
- Ensure Rust is in PATH: `rustc --version`
- Try: `rustup update`

### Build Fails on macOS
- Install Xcode Command Line Tools
- Accept Xcode license: `sudo xcodebuild -license accept`

### Build Fails on Linux
- Install all system dependencies (see Prerequisites)
- Try: `sudo apt update && sudo apt upgrade`

### App Won't Start
- Check console for errors
- Verify .env file exists with correct API URL
- Test web app first to ensure backend is working
