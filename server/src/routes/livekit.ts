import express from "express";
import { AccessToken } from "livekit-server-sdk";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

// LiveKit credentials - REQUIRED in production
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

// Generate LiveKit access token
router.post("/token", authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomName } = req.body;
    const userId = req.user!.id;
    const userName = req.user!.email;

    if (!roomName) {
      return res.status(400).json({ error: "roomName is required" });
    }

    // LiveKit credentials are required in production
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error("❌ LiveKit credentials missing! Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in server/.env");
      return res
        .status(500)
        .json({ 
          error: "LiveKit credentials not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your .env file."
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

