# LiveKit Setup Guide

## Quick Setup for Local Development

### Option 1: Use LiveKit Cloud (Easiest)

1. Sign up at https://cloud.livekit.io/
2. Create a project
3. Get your API Key and Secret from the dashboard
4. Add to `server/.env`:
   ```
   LIVEKIT_API_KEY=your_api_key_here
   LIVEKIT_API_SECRET=your_api_secret_here
   LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

### Option 2: Run LiveKit Server Locally

#### Windows:

1. Download LiveKit server from: https://github.com/livekit/livekit/releases
   - Download: `livekit-server_windows_amd64.zip`

2. Extract and add to PATH, or run from extracted folder

3. Generate a config file:
   ```powershell
   livekit-server --dev
   ```
   This creates a `livekit.yaml` with development credentials.

4. Or create `livekit.yaml` manually:
   ```yaml
   port: 7880
   rtc:
     tcp_port: 7881
     port_range_start: 50000
     port_range_end: 60000
   keys:
     devkey: devsecret
   ```

5. Add to `server/.env`:
   ```
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=devsecret
   LIVEKIT_URL=ws://localhost:7880
   ```

6. Start LiveKit server:
   ```powershell
   livekit-server --config livekit.yaml
   ```

### Option 3: Docker (Recommended for Development)

1. Create `docker-compose.yml` in project root:
   ```yaml
   version: '3.8'
   services:
     livekit:
       image: livekit/livekit-server:latest
       ports:
         - "7880:7880"
         - "7881:7881"
         - "50000-60000:50000-60000/udp"
       command: --dev
       environment:
         - LIVEKIT_KEYS=devkey: devsecret
   ```

2. Run:
   ```powershell
   docker-compose up -d livekit
   ```

3. Add to `server/.env`:
   ```
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=devsecret
   LIVEKIT_URL=ws://localhost:7880
   ```

## Verification

After setup, restart your backend server and test:
```powershell
# Check LiveKit is running
netstat -ano | findstr :7880

# Restart backend
cd server
npm run dev
```

## Development Credentials (Quick Start)

For quick local development, you can use these temporary credentials:

```
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
```

**Note:** These are for development only. For production, use secure, unique credentials.

