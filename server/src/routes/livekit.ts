import express from "express";
import { AccessToken } from "livekit-server-sdk";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

// Use dev credentials as fallback for local development (when LiveKit runs with --dev)
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "devsecret";

// Generate LiveKit access token
router.post("/token", authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomName } = req.body;
    const userId = req.user!.id;
    const userName = req.user!.email;

    if (!roomName) {
      return res.status(400).json({ error: "roomName is required" });
    }

    // Note: We use devkey/devsecret as defaults for local development
    // In production, make sure to set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your .env file
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error("❌ LiveKit credentials missing! Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in server/.env");
      return res
        .status(500)
        .json({ 
          error: "LiveKit credentials not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your .env file.",
          details: "For local development with --dev mode, use: LIVEKIT_API_KEY=devkey and LIVEKIT_API_SECRET=devsecret"
        });
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userId,
      name: userName,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    res.json({ token });
  } catch (error: any) {
    console.error("Error generating LiveKit token:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

