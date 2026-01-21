# Building Desktop Installers for Summit

## Quick Start

The desktop app build takes 10-15 minutes the first time (Rust compilation), then 2-5 minutes for subsequent builds.

### Build Windows Installer (on Windows)

```bash
cd summit/desktop
npm run tauri:build
```

**Output location:**
- `summit/desktop/src-tauri/target/release/bundle/nsis/Summit_0.1.0_x64-setup.exe` (recommended)
- `summit/desktop/src-tauri/target/release/bundle/msi/Summit_0.1.0_x64_en-US.msi`

### Build macOS Installer (on macOS)

```bash
cd summit/desktop
npm run tauri:build
```

**Output location:**
- `summit/desktop/src-tauri/target/release/bundle/dmg/Summit_0.1.0_x64.dmg`

### Build Linux Installer (on Linux)

```bash
cd summit/desktop
npm run tauri:build
```

**Output location:**
- `summit/desktop/src-tauri/target/release/bundle/appimage/summit-desktop_0.1.0_amd64.AppImage`
- `summit/desktop/src-tauri/target/release/bundle/deb/summit-desktop_0.1.0_amd64.deb`

## Hosting Options

### Option 1: GitHub Releases (Recommended - Free)

1. Create a new release on GitHub
2. Upload the installers as release assets
3. Update `summit/desktop/src/pages/Download.tsx` with the GitHub release URLs:

```typescript
const downloadLinks = {
  windows: "https://github.com/YOUR_USERNAME/summit/releases/download/v0.1.0/Summit_0.1.0_x64-setup.exe",
  mac: "https://github.com/YOUR_USERNAME/summit/releases/download/v0.1.0/Summit_0.1.0_x64.dmg",
  linux: "https://github.com/YOUR_USERNAME/summit/releases/download/v0.1.0/summit-desktop_0.1.0_amd64.AppImage",
};
```

4. Enable the download buttons by removing `disabled` attribute and changing the button handler

### Option 2: AWS S3

1. Create an S3 bucket: `summit-downloads`
2. Upload installers to the bucket
3. Make files public or use CloudFront
4. Update download URLs in `Download.tsx`

### Option 3: Your Own Server

1. Upload installers to your web server
2. Update download URLs in `Download.tsx`

## Updating the Download Page

Once installers are ready, update `summit/desktop/src/pages/Download.tsx`:

1. Remove the "Coming Soon" notice
2. Update download URLs
3. Remove `disabled` attribute from buttons
4. Change button text back to "Download .exe", "Download .dmg", etc.
5. Update the `handleDownload` function to actually download:

```typescript
const handleDownload = (os: OS) => {
  if (os === "unknown") return;
  window.location.href = downloadLinks[os];
};
```

## Build Time Expectations

**First build:**
- Windows: ~10-15 minutes
- macOS: ~8-12 minutes  
- Linux: ~8-12 minutes

**Subsequent builds:**
- All platforms: ~2-5 minutes

## Troubleshooting

### Build fails on Windows
- Install Visual Studio C++ Build Tools
- Ensure Rust is in PATH: `rustc --version`
- Try: `rustup update`

### Build fails on macOS
- Install Xcode Command Line Tools: `xcode-select --install`
- Accept Xcode license: `sudo xcodebuild -license accept`

### Build fails on Linux
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

## Testing the Installer

1. Build the installer
2. Install on a clean test machine
3. Verify:
   - App launches correctly
   - Login works
   - Video calls work
   - Notifications work
   - All features match web version

## Current Status

✅ Tauri configured and ready
✅ All dependencies installed
✅ Build scripts ready
⏳ Installers need to be built (run `npm run tauri:build`)
⏳ Installers need to be hosted
⏳ Download page needs final URLs

## Next Steps

1. Run `npm run tauri:build` in `summit/desktop` directory
2. Test the installer on a clean machine
3. Upload to GitHub Releases or S3
4. Update download URLs in `Download.tsx`
5. Deploy updated web app to Amplify
6. Users can now download the desktop app!
