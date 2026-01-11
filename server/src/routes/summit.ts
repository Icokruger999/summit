import express from "express";
import { summitQuery } from "../lib/db.js";

const router = express.Router();

// API Key middleware for external apps
// In production, store API keys in database or environment variables
const SUMMIT_API_KEY = process.env.SUMMIT_API_KEY || "your-api-key-here";

function validateApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers["x-api-key"] || req.headers["api-key"];
  
  if (!apiKey || apiKey !== SUMMIT_API_KEY) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  
  next();
}

// Optional: Use API key validation for all endpoints, or make some public
// Uncomment the line below to require API key for all summit endpoints
// router.use(validateApiKey);

// GET /api/summit/status - Public health/status endpoint
router.get("/status", async (req, res) => {
  try {
    res.json({
      status: "ok",
      service: "Summit API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in summit status endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/summit/users - Get users (requires API key)
router.get("/users", validateApiKey, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    const result = await summitQuery(
      `SELECT id, email, name, avatar_url, company, job_title, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit as string), parseInt(offset as string)]
    );

    res.json({
      users: result.rows,
      count: result.rows.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/summit/users/:id - Get specific user (requires API key)
router.get("/users/:id", validateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await summitQuery(
      `SELECT id, email, name, avatar_url, company, job_title, phone, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/summit/meetings - Get meetings (requires API key)
router.get("/meetings", validateApiKey, async (req, res) => {
  try {
    const { limit = 100, offset = 0, user_id } = req.query;
    
    let queryText = `
      SELECT 
        m.id,
        m.title,
        m.description,
        m.start_time,
        m.end_time,
        m.room_id,
        m.created_by,
        m.recurrence,
        m.created_at,
        m.updated_at
      FROM meetings m
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (user_id) {
      queryText += ` WHERE m.created_by = $${paramIndex} OR EXISTS (
        SELECT 1 FROM meeting_participants mp 
        WHERE mp.meeting_id = m.id AND mp.user_id = $${paramIndex}
      )`;
      params.push(user_id);
      paramIndex++;
    }
    
    queryText += ` ORDER BY m.start_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await summitQuery(queryText, params);

    res.json({
      meetings: result.rows,
      count: result.rows.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/summit/webhook - Webhook endpoint for external apps (requires API key)
router.post("/webhook", validateApiKey, async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Process webhook data here
    console.log("Webhook received:", { event, data });
    
    // Example: Handle different event types
    switch (event) {
      case "user.created":
        // Handle user created event
        break;
      case "meeting.created":
        // Handle meeting created event
        break;
      default:
        console.log("Unknown event type:", event);
    }
    
    res.json({
      success: true,
      message: "Webhook received",
      event,
    });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

