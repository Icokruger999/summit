import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// crypto import removed - no longer needed
import { 
  getUserByEmail, 
  getUserById, 
  updateUserPassword,
  deleteExpiredAccounts,
  startTrial,
  query
} from "../lib/db.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// No longer needed - removed temp password system

// Register new user (with password)
router.post("/register", async (req, res) => {
  try {
    const { email, name, password, job_title, phone, company } = req.body;

    // Validate required fields
    if (!email || !name || !password) {
      return res.status(400).json({ error: "Email, name, and password are required" });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Normalize email to lowercase for case-insensitive handling
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if user already exists (case-insensitive)
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ 
        error: "User already exists",
        message: "An account with this email already exists. Please log in instead."
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Normalize optional fields
    const normalizedJobTitle = (!job_title || job_title.trim() === '' || job_title.trim().toUpperCase() === 'N/A') 
      ? null 
      : job_title.trim();
    const normalizedPhone = (!phone || phone.trim() === '' || phone.trim().toUpperCase() === 'N/A') 
      ? null 
      : phone.trim();
    const normalizedCompany = (!company || company.trim() === '' || company.trim().toUpperCase() === 'N/A') 
      ? null 
      : company.trim();

    // Create user with password
    const result = await query(
      `INSERT INTO users (email, name, password_hash, job_title, phone, company, requires_password_change)
       VALUES ($1, $2, $3, $4, $5, $6, false)
       RETURNING id, email, name, avatar_url, company, job_title, phone, created_at`,
      [normalizedEmail, name, passwordHash, normalizedJobTitle, normalizedPhone, normalizedCompany]
    );

    const user = result.rows[0];

    // Start trial immediately
    await startTrial(user.id);
    console.log(`✅ User created and trial started for ${normalizedEmail}`);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user data and token
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        company: user.company,
        job_title: user.job_title,
        phone: user.phone,
      },
      token,
      message: "Account created successfully. Your 3-day trial has started!",
    });
  } catch (error: any) {
    console.error("Error registering user:", error);
    
    // Handle duplicate user error
    if (error.code === '23505' || error.constraint === 'users_email_key' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return res.status(400).json({ 
        error: "User already exists",
        message: "An account with this email already exists. Please log in instead."
      });
    }
    
    res.status(500).json({ error: error.message || "Failed to create account" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Normalize email to lowercase for case-insensitive login
    const normalizedEmail = email.toLowerCase().trim();

    // Get user by email (case-insensitive lookup)
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Check password
    if (!user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user data
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        company: user.company,
        job_title: user.job_title,
        phone: user.phone,
      },
      token,
    });
  } catch (error: any) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: error.message || "Failed to login" });
  }
});

// Change password (mandatory for temp password users)
router.post("/change-password", authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    // Get user
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if password change is required
    if (!user.requires_password_change) {
      // If not required, verify current password
      if (!user.password_hash) {
        return res.status(400).json({ error: "No password set. Please use password reset." });
      }

      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidCurrentPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    } else {
      // If password change is required, verify temp password
      if (!user.temp_password_hash) {
        return res.status(400).json({ error: "No temporary password found" });
      }

      const isValidTempPassword = await bcrypt.compare(currentPassword, user.temp_password_hash);
      if (!isValidTempPassword) {
        return res.status(401).json({ error: "Temporary password is incorrect" });
      }
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await updateUserPassword(userId, newPasswordHash);

    // Start trial if this is the first password change (from temp password)
    if (user.requires_password_change && !user.trial_started_at) {
      await startTrial(userId);
      console.log(`✅ Trial started for user ${userId}`);
    }

    res.json({
      message: "Password changed successfully",
      trialStarted: user.requires_password_change && !user.trial_started_at,
    });
  } catch (error: any) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: error.message || "Failed to change password" });
  }
});

// Get current user
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      company: user.company,
      job_title: user.job_title,
      phone: user.phone,
      requiresPasswordChange: user.requires_password_change || false,
    });
  } catch (error: any) {
    console.error("Error getting user:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Resend email endpoint removed - no longer needed without temp passwords

// Cleanup endpoint removed - no longer needed without temp passwords

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default router;
