# How to Start the Backend Server

## Quick Start

Open a **new terminal window** and run:

```bash
cd C:\CodingE-Chat\server
npm run dev
```

You should see:
```
Server running on port 3000
```

## Verify It's Running

In another terminal, test the health endpoint:
```bash
curl http://localhost:3000/health
```

Or open in browser: http://localhost:3000/health

You should see: `{"status":"ok"}`

## Troubleshooting

### Port 3000 already in use
```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Dependencies not installed
```bash
cd server
npm install
```

### Database connection errors
Make sure your PostgreSQL database is accessible and credentials are correct in `.env` file.

## Environment Variables

Create `server/.env` file (or copy from `.env.example`):
```env
PORT=3000
DB_HOST=codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=Summit
DB_USER=postgres
DB_PASSWORD=your_database_password
JWT_SECRET=your-secret-key-change-in-production

# LiveKit Configuration (for local development)
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
```

**Note:** The LiveKit credentials above are for local development. The backend will automatically use `devkey`/`devsecret` if not set, which matches LiveKit's `--dev` mode.

## Keep It Running

The server must stay running while you use the desktop app. Keep the terminal window open.

