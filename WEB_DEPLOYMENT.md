# Summit Web Deployment Guide

Summit works perfectly as a **web application** and can be deployed to any static hosting service. The desktop app is optional but available for users who prefer it.

## Quick Start

### Development (Web Mode)
```powershell
cd desktop
npm run dev
```
Access at: `http://localhost:5173`

### Production Build (Web)
```powershell
cd desktop
npm run build:web
```
Output: `desktop/dist/` folder (ready to deploy)

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Set build directory to: `desktop`
4. Build command: `npm run build:web`
5. Output directory: `dist`
6. Add environment variable: `VITE_SERVER_URL` = your backend URL
7. Deploy!

### Option 2: Netlify
1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and connect your repo
3. Build settings:
   - Base directory: `desktop`
   - Build command: `npm run build:web`
   - Publish directory: `desktop/dist`
4. Add environment variable: `VITE_SERVER_URL`
5. Deploy!

### Option 3: GitHub Pages
1. Install `gh-pages`: `npm install --save-dev gh-pages`
2. Add to `package.json` scripts:
   ```json
   "deploy": "npm run build:web && gh-pages -d dist"
   ```
3. Run: `npm run deploy`

### Option 4: Any Static Host (AWS S3, Cloudflare Pages, etc.)
1. Build: `npm run build:web`
2. Upload contents of `desktop/dist/` to your static host
3. Configure environment variables as needed

## Environment Variables

### Required for Production
- `VITE_SERVER_URL` - Your backend API URL (e.g., `https://api.yourdomain.com`)
  - If not set, defaults to `http://localhost:3000` (development)

### Optional
- `VITE_LIVEKIT_URL` - LiveKit WebSocket URL (if different from backend)

## Desktop App (Optional)

Users can download the desktop app if they prefer:
- Built with Tauri (small, fast, native)
- Available for Windows, macOS, and Linux
- Includes features like local recording and desktop notifications

### Building Desktop App
```powershell
cd desktop
npm run tauri:build
```
Output: `desktop/src-tauri/target/release/bundle/`

## Web vs Desktop Features

### Works in Both
✅ Chat messaging
✅ Video/audio calls
✅ Screen sharing
✅ Meetings
✅ Contacts
✅ Profile management

### Desktop Only
🎯 Local recording (saves to disk)
🎯 Desktop notifications (system tray)
🎯 Offline asset caching

## Production Checklist

- [ ] Set `VITE_SERVER_URL` environment variable
- [ ] Ensure backend CORS allows your web domain
- [ ] Configure LiveKit for production (use LiveKit Cloud or self-hosted)
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Enable HTTPS (required for WebRTC)
- [ ] Set up proper error monitoring
- [ ] Configure CDN for static assets (optional but recommended)

## Troubleshooting

### CORS Errors
Make sure your backend allows requests from your web domain:
```typescript
app.use(cors({
  origin: ['https://yourdomain.com', 'http://localhost:5173']
}));
```

### WebRTC Not Working
- Ensure site is served over HTTPS (required for WebRTC)
- Check browser console for WebRTC errors
- Verify LiveKit server is accessible from client

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (requires Node 18+)

## Adding "Download Desktop App" Link

The web app can include a banner or link to download the desktop version. Add this to your Settings component or as a footer element.

Example:
```tsx
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

{!isTauri && (
  <a href="/download" className="download-desktop-link">
    Download Desktop App
  </a>
)}
```


