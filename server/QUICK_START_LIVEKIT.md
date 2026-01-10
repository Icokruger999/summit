# Quick Start: LiveKit Server for Windows

## Option 1: Download LiveKit Binary (Fastest)

1. **Download LiveKit Server:**
   - Go to: https://github.com/livekit/livekit/releases
   - Download: `livekit-server_windows_amd64.zip`
   - Extract to a folder (e.g., `C:\tools\livekit`)

2. **Run LiveKit in Development Mode:**
   ```powershell
   cd C:\tools\livekit  # or wherever you extracted it
   .\livekit-server.exe --dev
   ```

3. **The server will start on port 7880** with these credentials:
   - API Key: `devkey`
   - API Secret: `devsecret`
   - URL: `ws://localhost:7880`

4. **Keep this terminal open** while using the app.

## Option 2: Use Docker (If Installed)

```powershell
# From project root
docker-compose up -d livekit
```

## Option 3: LiveKit Cloud (Easiest, No Installation)

1. Sign up at https://cloud.livekit.io/
2. Create a project
3. Get your API Key and Secret
4. Update `server/.env`:
   ```
   LIVEKIT_API_KEY=your_api_key_from_cloud
   LIVEKIT_API_SECRET=your_api_secret_from_cloud
   LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

## Verify It's Running

After starting LiveKit, check:
```powershell
netstat -ano | findstr :7880
```

You should see port 7880 listening.

## Your .env Already Has Development Credentials

Your `server/.env` file already has:
```
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
```

Just start the LiveKit server and restart your backend!

