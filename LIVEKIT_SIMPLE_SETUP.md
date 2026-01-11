# LiveKit Setup - Super Simple Guide

## Why Do I Need LiveKit?

LiveKit provides the **real-time communication** for your chat app:
- **Real-time messaging** (sending/receiving messages instantly)
- **Video/audio calls** (when you click the call buttons)
- **Data channels** for chat messages

Without LiveKit, the chat won't work - that's why you're seeing "Disconnected" and messages failing.

## Easiest Setup (2 Steps)

### Step 1: Run the Setup Script

Just double-click or run:
```powershell
.\setup-livekit.ps1
```

This will:
- Download LiveKit automatically
- Start it in development mode
- Use the credentials already in your `server/.env`

### Step 2: Keep It Running

**Keep that PowerShell window open** while using the app. That's it! ✅

---

## Alternative: Manual Download (If script doesn't work)

1. **Download:** https://github.com/livekit/livekit/releases/latest
   - Click on `livekit-server_windows_amd64.zip`

2. **Extract** to a folder (e.g., `C:\CodingE-Chat\tools\`)

3. **Run:**
   ```powershell
   cd C:\CodingE-Chat\tools
   .\livekit-server.exe --dev
   ```

4. **Keep that window open** while using the app

---

## What Happens After Setup?

Once LiveKit is running:
- ✅ Chat will show "Connected" instead of "Disconnected"
- ✅ Messages will send successfully
- ✅ Real-time messaging will work
- ✅ Video/audio calls will be available

Your backend is already configured with:
- `LIVEKIT_API_KEY=devkey`
- `LIVEKIT_API_SECRET=devsecret`
- `LIVEKIT_URL=ws://localhost:7880`

Just start the LiveKit server and everything will work! 🎉

---

## Troubleshooting

**Port 7880 already in use?**
```powershell
# Find what's using it
netstat -ano | findstr :7880

# Kill it (replace PID)
taskkill /PID <PID> /F
```

**Want to use LiveKit Cloud instead?** (No installation needed)
1. Sign up: https://cloud.livekit.io/
2. Get your API Key & Secret
3. Update `server/.env` with your cloud credentials




