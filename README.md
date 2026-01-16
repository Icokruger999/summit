# Summit - Professional Communication Platform

**Summit** by Coding Everest - Professional communication platform

A modern communication platform built with React, Tailwind CSS, and LiveKit for video/audio calls and real-time chat. Works as a **web application** with an optional **desktop app** available for download.

## Features

- **Direct & Group Chats**: Real-time messaging via LiveKit Data Channels
- **Video/Audio Calls**: WebRTC-based calls with screen sharing
- **Meeting Scheduling**: Calendar-based meeting management
- **File Attachments**: Share files through chat
- **Works as Web App**: Full functionality in any modern browser
- **Optional Desktop App**: Download for Windows, macOS, or Linux
  - Desktop-only features: Local recording, desktop notifications, offline caching

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Desktop**: Tauri v2 (optional, Rust + React)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + PgBouncer on EC2 (localhost connection pooling)
- **Real-time**: LiveKit (WebRTC SFU + Data Channels)
- **File Storage**: Backend file storage (configurable)
- **Recording**: FFmpeg via Tauri plugin (desktop only)

## Project Structure

```
CodingE-Chat/
├── desktop/          # Tauri v2 desktop app
├── server/           # Express backend server
├── shared/           # Shared TypeScript types
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL + PgBouncer on EC2 instance (see [EC2_DATABASE_SETUP.md](./EC2_DATABASE_SETUP.md))
- LiveKit server (can run on EC2 or use LiveKit Cloud)

**For Desktop App Only:**
- Rust (for Tauri desktop builds)

### Web App Setup (Recommended)

1. Navigate to `desktop/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development:
   ```bash
   npm run dev
   ```
   Access at: `http://localhost:5173`
4. Build for production:
   ```bash
   npm run build:web
   ```
   Output: `desktop/dist/` folder (ready to deploy)
5. Deploy to Vercel, Netlify, or any static host
   See [WEB_DEPLOYMENT.md](./WEB_DEPLOYMENT.md) for detailed deployment instructions

### Desktop App Setup (Optional)

1. Navigate to `desktop/` directory
2. Install dependencies (including Rust/Tauri):
   ```bash
   npm install
   ```
3. Run in development:
   ```bash
   npm run tauri:dev
   ```
4. Build for production:
   ```bash
   npm run tauri:build
   ```
   Output: `desktop/src-tauri/target/release/bundle/`

### Backend Server Setup

1. Navigate to `server/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   nano .env
   ```
   **Important**: Use `DB_HOST=127.0.0.1` and `DB_PORT=6432` (PgBouncer)
4. Run in development:
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   npm start
   ```

See [TEST_SIGNIN.md](./TEST_SIGNIN.md) for testing and deployment verification.
   ```

### Database Setup (AWS RDS PostgreSQL)

Create the following tables in your Summit database:

1. **users** - User accounts and profiles
2. **meetings** - Scheduled meetings
3. **meeting_participants** - Many-to-many relationship
4. **chat_requests** - Chat request management
5. **presence** - User online/offline status
6. **message_reads** - Read receipts for messages

See `database/schema.sql` or `database/complete_schema.sql` for the complete schema.

### LiveKit Setup

1. Deploy LiveKit server on EC2
2. Configure API keys in backend `.env`
3. Update `VITE_LIVEKIT_URL` in desktop `.env`

## Environment Variables

### Frontend/Web App (.env)
- `VITE_SERVER_URL` - Backend API URL (default: http://localhost:3000)
  - For production: Set to your backend API URL (e.g., https://api.yourdomain.com)
- `VITE_LIVEKIT_URL` - LiveKit WebSocket URL (default: ws://localhost:7880)
- `VITE_ASSETS_MANIFEST_URL` - Optional: Asset manifest URL for installer (desktop only)

### Backend Server (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Server port (default: 3000)
- `LIVEKIT_API_KEY` - LiveKit API key
- `LIVEKIT_API_SECRET` - LiveKit API secret
- `LIVEKIT_URL` - LiveKit server URL
- `SUPABASE_URL` - Optional: For file storage (if using Supabase Storage)
- `SUPABASE_SERVICE_KEY` - Optional: For file storage

## Development

The application is structured in phases:

1. **Phase 1**: Project setup and authentication
2. **Phase 2**: LiveKit integration
3. **Phase 3**: Backend server foundation
4. **Phase 4**: Chat system (LiveKit Data Channels)
5. **Phase 5**: Meeting scheduling
6. **Phase 6**: Video/audio calls
7. **Phase 7**: File attachments
8. **Phase 8**: Local recording (FFmpeg)
9. **Phase 9**: Polish and testing

## License

ISC

