# How to Start Summit Desktop App

## Prerequisites
- ✅ Rust installed (check with `rustc --version`)
- ✅ Node.js installed (check with `node --version`)
- ✅ PostgreSQL database running and accessible

## Step 1: Start the Backend Server

Open a terminal and run:
```bash
cd server
npm install  # First time only
npm run dev
```

The backend will run on `http://localhost:3000`

## Step 2: Start the Desktop App

Open a **new terminal** and run:
```bash
cd desktop
npm install  # First time only
npm run tauri:dev
```

**First time setup:**
- The first time you run `npm run tauri:dev`, it will:
  1. Download and compile Rust dependencies (takes 2-5 minutes)
  2. Build the Tauri backend
  3. Start the Vite dev server on port 1420
  4. Open a desktop window (not a browser!)

**Subsequent runs:**
- Much faster (30 seconds - 1 minute)
- Just compiles your changes

## What You'll See

1. **Terminal output** - Shows compilation progress
2. **Desktop window** - A native desktop app window will open
3. **Vite dev server** - Running on http://localhost:1420 (for Tauri to load)

## Troubleshooting

### Desktop window doesn't open
- Check terminal for errors
- Make sure port 1420 is not in use
- Try `npm run tauri:dev` again

### Backend connection errors
- Make sure backend server is running (`cd server && npm run dev`)
- Check that backend is on port 3000
- Verify database connection in `server/.env`

### Rust compilation errors
- Make sure Rust is installed: `rustc --version`
- Try: `cd desktop/src-tauri && cargo clean && cd .. && npm run tauri:dev`

### Port already in use
- Kill process on port 1420: `netstat -ano | findstr :1420`
- Or change port in `desktop/vite.config.ts`

## Quick Start (Both Servers)

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Desktop App:**
```bash
cd desktop
npm run tauri:dev
```

## Building for Production

To create a distributable desktop app:
```bash
cd desktop
npm run tauri:build
```

The built app will be in `desktop/src-tauri/target/release/bundle/`

