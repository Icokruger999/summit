import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { query } from "../lib/db.js";

const router = express.Router();

// Get all users (for invitations, etc.)
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user!.id;

    // Get all users except the current user
    const result = await query(`
      SELECT id, email, name, avatar_url, company, job_title, phone, created_at
      FROM users
      WHERE id != $1
      ORDER BY name, email
    `, [currentUserId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: error.message });
  }
});

// Search user by email (exact match)
router.get("/search", authenticate, async (req: AuthRequest, res) => {
  try {
    const { email } = req.query;
    const currentUserId = req.user!.id;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    // Search for user by exact email match (case-insensitive for better UX)
    const normalizedEmail = email.trim().toLowerCase();
    const result = await query(`
      SELECT id, email, name, avatar_url, company, job_title, phone, created_at
      FROM users
      WHERE LOWER(email) = $1 AND id != $2
    `, [normalizedEmail, currentUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No user found with this email address" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error searching user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update current user's profile
router.put("/me/profile", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, job_title, phone, company } = req.body;

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name || null);
      paramIndex++;
    }
    if (job_title !== undefined) {
      updates.push(`job_title = $${paramIndex}`);
      values.push(job_title || null);
      paramIndex++;
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone || null);
      paramIndex++;
    }
    if (company !== undefined) {
      updates.push(`company = $${paramIndex}`);
      values.push(company || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(userId);
    const updateQuery = `
      UPDATE users
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, email, name, avatar_url, company, job_title, phone, created_at
    `;

    console.log("Updating profile with query:", updateQuery);
    console.log("Values:", values);

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    
    // Check if it's a column doesn't exist error
    if (error.message && (error.message.includes("column") || error.message.includes("does not exist"))) {
      return res.status(500).json({ 
        error: "Database columns (job_title, phone) are missing. Please run the migration: database/migration_add_profile_fields.sql. Error: " + error.message
      });
    }
    
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
});

// Get full user profile (for "See More" popup)
router.get("/:userId/profile", authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;

    // Get full profile including company, job_title, phone
    const result = await query(`
      SELECT id, email, name, avatar_url, company, job_title, phone, created_at
      FROM users
      WHERE id = $1 AND id != $2
    `, [userId, currentUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

