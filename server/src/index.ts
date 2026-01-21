import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import authRoutes from "./routes/auth.js";
import meetingsRoutes from "./routes/meetings.js";
import livekitRoutes from "./routes/livekit.js";
import filesRoutes from "./routes/files.js";
import usersRoutes from "./routes/users.js";
import presenceRoutes from "./routes/presence.js";
import messagesRoutes from "./routes/messages.js";
import chatRequestsRoutes from "./routes/chatRequests.js";
import chatsRoutes from "./routes/chats.js";
import summitRoutes from "./routes/summit.js";
import subscriptionsRoutes from "./routes/subscriptions.js";
import chimeRoutes from "./routes/chime.js";
import uploadsRoutes from "./routes/uploads.js";
import { messageNotifier } from "./lib/messageNotifier.js";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
// Production: PORT must be set via environment variable (default: 3000)
// NEVER use ports 5000 or 50001
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Validate port is not 5000 or 50001
if (PORT === 5000 || PORT === 50001) {
  console.error('❌ ERROR: Port 5000 and 50001 are not allowed. Please use a different port.');
  process.exit(1);
}

const server = createServer(app);

// WebSocket server for real-time notifications
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  console.log("📡 WebSocket connection attempt");
  console.log("📡 Request URL:", req.url);
  console.log("📡 Request headers:", JSON.stringify(req.headers, null, 2));
  
  // Extract token from query string (standard practice - browser WebSocket API doesn't support custom headers)
  // Alternative: Could use Sec-WebSocket-Protocol header, but query string is simpler and well-supported
  let token: string | null = null;
  
  if (req.url) {
    try {
      // Parse query string manually (more reliable than URL constructor)
      const urlParts = req.url.split("?");
      if (urlParts.length > 1) {
        const queryParams = new URLSearchParams(urlParts[1]);
        token = queryParams.get("token");
      }
    } catch (error) {
      console.error("❌ Error parsing WebSocket URL:", error);
    }
  }
  
  // Fallback: Try Sec-WebSocket-Protocol header (alternative method)
  if (!token && req.headers["sec-websocket-protocol"]) {
    const protocols = req.headers["sec-websocket-protocol"].split(",").map((p: string) => p.trim());
    // Look for token in protocol header (if implemented)
    const tokenIndex = protocols.findIndex((p: string) => p.startsWith("token."));
    if (tokenIndex !== -1) {
      token = protocols[tokenIndex].replace("token.", "");
      console.log("📡 Token found in Sec-WebSocket-Protocol header");
    }
  }
  
  if (!token) {
    console.error("❌ No token provided in WebSocket connection");
    console.error("   URL:", req.url);
    console.error("   Headers:", Object.keys(req.headers).join(", "));
    ws.close(1008, "No token provided");
    return;
  }
  
  // JWT_SECRET is required in production
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === "your-secret-key") {
    console.error('❌ ERROR: JWT_SECRET must be set to a secure value in production');
    ws.close(1011, "Server configuration error");
    return;
  }
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as { id: string; email: string };
    console.log("✅ WebSocket token verified for user:", decoded.id);
    messageNotifier.addClient(decoded.id, ws);
    
    ws.send(JSON.stringify({ type: "CONNECTED", userId: decoded.id }));
  } catch (error: any) {
    console.error("❌ WebSocket auth error:", error.message);
    console.error("   Error type:", error.name);
    console.error("   Token length:", token.length);
    console.error("   JWT_SECRET set:", !!process.env.JWT_SECRET);
    
    // Provide more specific error codes
    if (error.name === "TokenExpiredError") {
      ws.close(1008, "Token expired");
    } else if (error.name === "JsonWebTokenError") {
      ws.close(1008, "Invalid token format");
    } else {
      ws.close(1008, "Invalid token");
    }
  }
});

// CORS configuration - Production only, no localhost
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(origin => !origin.includes('localhost') && !origin.includes('127.0.0.1'))
  : ['https://www.codingeverest.com', 'https://codingeverest.com', 'https://summit.codingeverest.com'];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight requests for 24 hours
};

// Validate CORS_ORIGIN is set in production
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.warn('⚠️  WARNING: CORS_ORIGIN not set in production. Using default production origins.');
}

console.log('✅ CORS configured for origins:', allowedOrigins.join(', '));

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle OPTIONS preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

// Routes
// Subscription middleware disabled for now
// import { checkSubscriptionAccess } from "./middleware/subscription.js";
app.use("/api/auth", authRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);

// All routes - subscription check disabled
app.use("/api/meetings", meetingsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/livekit", livekitRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/presence", presenceRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/chat-requests", chatRequestsRoutes);
app.use("/api/chats", chatsRoutes);
app.use("/api/summit", summitRoutes);
app.use("/api/chime", chimeRoutes);
app.use("/api/uploads", uploadsRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Get server hostname (never use localhost in production)
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

server.listen(PORT, HOST, () => {
  console.log(`✅ Server running on ${HOST}:${PORT}`);
  console.log(`✅ WebSocket server ready on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
});

