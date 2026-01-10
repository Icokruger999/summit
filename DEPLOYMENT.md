# Deployment Guide

This guide covers deploying the CodingE Chat application to EC2.

## Prerequisites

- AWS EC2 instance (Ubuntu 22.04 LTS recommended)
- Domain name (optional, for production)
- Supabase project configured
- LiveKit server binary

## EC2 Setup

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Rust (for Tauri builds if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Deploy Backend Server

```bash
# Clone or upload your project
cd /opt
sudo mkdir codinge-chat
sudo chown $USER:$USER codinge-chat
cd codinge-chat

# Copy server files
# (Upload via SCP, Git, or other method)

cd server
npm install
npm run build

# Create .env file
sudo nano .env
```

Backend `.env` file:
```
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_secure_jwt_secret
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=ws://localhost:7880
```

```bash
# Start with PM2
pm2 start dist/index.js --name codinge-chat-server
pm2 save
pm2 startup
```

### 3. Deploy LiveKit Server

```bash
# Download LiveKit server
cd /opt
wget https://github.com/livekit/livekit/releases/latest/download/livekit-server_linux_amd64.tar.gz
tar -xzf livekit-server_linux_amd64.tar.gz
sudo mv livekit-server /usr/local/bin/
sudo chmod +x /usr/local/bin/livekit-server

# Create LiveKit config
sudo mkdir -p /etc/livekit
sudo nano /etc/livekit/config.yaml
```

LiveKit config (`/etc/livekit/config.yaml`):
```yaml
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
keys:
  APxxxxx: your_livekit_api_secret
```

```bash
# Create systemd service
sudo nano /etc/systemd/system/livekit.service
```

LiveKit systemd service:
```ini
[Unit]
Description=LiveKit SFU Server
After=network.target

[Service]
Type=simple
User=livekit
ExecStart=/usr/local/bin/livekit-server --config /etc/livekit/config.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Create livekit user
sudo useradd -r -s /bin/false livekit
sudo chown -R livekit:livekit /etc/livekit

# Start LiveKit
sudo systemctl enable livekit
sudo systemctl start livekit
sudo systemctl status livekit
```

### 4. Configure Firewall

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow LiveKit ports
sudo ufw allow 7880/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 50000:60000/udp

# Allow backend API
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
```

### 5. Set Up Reverse Proxy (Optional, for production)

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/codinge-chat
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # LiveKit WebSocket
    location /livekit {
        proxy_pass http://localhost:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/codinge-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Certificate (Optional, for production)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com
```

## Database Setup (Supabase)

### Create Tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  room_id TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting participants
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view meetings they created or are participants in" ON public.meetings
  FOR SELECT USING (
    created_by = auth.uid() OR
    id IN (SELECT meeting_id FROM public.meeting_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create meetings" ON public.meetings
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update meetings they created" ON public.meetings
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete meetings they created" ON public.meetings
  FOR DELETE USING (created_by = auth.uid());
```

### Create Storage Bucket

1. Go to Supabase Dashboard > Storage
2. Create bucket named `attachments`
3. Set to public or configure RLS policies as needed

## Desktop App Build

### Build for Production

```bash
cd desktop
npm install
npm run build
npm run tauri build
```

This will create installers in `desktop/src-tauri/target/release/bundle/`:
- Windows: `.msi` installer
- macOS: `.dmg` installer
- Linux: `.deb` or `.AppImage`

## Monitoring

### Check Backend Server

```bash
pm2 status
pm2 logs codinge-chat-server
```

### Check LiveKit Server

```bash
sudo systemctl status livekit
sudo journalctl -u livekit -f
```

### Check Nginx (if used)

```bash
sudo systemctl status nginx
sudo nginx -t
```

## Troubleshooting

### Backend not starting
- Check PM2 logs: `pm2 logs codinge-chat-server`
- Verify environment variables in `.env`
- Check port 3000 is available: `sudo lsof -i :3000`

### LiveKit not connecting
- Check LiveKit status: `sudo systemctl status livekit`
- Verify firewall allows UDP ports 50000-60000
- Check LiveKit logs: `sudo journalctl -u livekit -n 50`

### Database connection issues
- Verify Supabase credentials in backend `.env`
- Check Supabase project is active
- Verify RLS policies are correct

## Security Checklist

- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up Supabase RLS policies
- [ ] Use environment variables (never commit secrets)
- [ ] Enable firewall on EC2
- [ ] Regularly update dependencies
- [ ] Monitor logs for suspicious activity

