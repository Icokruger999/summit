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
import { messageNotifier } from "./lib/messageNotifier.js";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
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
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { id: string; email: string };
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

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'https://www.codingeverest.com', 'https://codingeverest.com'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/livekit", livekitRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/presence", presenceRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/chat-requests", chatRequestsRoutes);
app.use("/api/chats", chatsRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready at ws://localhost:${PORT}/ws`);
});

