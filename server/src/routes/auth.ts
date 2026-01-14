import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { 
  getUserByEmail, 
  getUserById, 
  createUserWithTempPassword,
  updateUserPassword,
  deleteExpiredAccounts
} from "../lib/db.js";
import { sendTempPasswordEmail } from "../lib/email.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Generate secure random password
function generateTempPassword(): string {
  // Generate 12-character password with uppercase, lowercase, numbers
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = crypto.randomBytes(12);
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

// Register new user (no password - uses temp password)
router.post("/register", async (req, res) => {
  try {
    const { email, name, job_title, phone, company } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

    // Create user with temp password
    const user = await createUserWithTempPassword(
      email,
      name,
      tempPasswordHash,
      job_title,
      phone,
      company
    );

    // Send temp password email
    try {
      await sendTempPasswordEmail(email, name, tempPassword);
      console.log(`✅ Temp password email sent to ${email}`);
    } catch (emailError: any) {
      console.error("❌ Failed to send temp password email:", emailError);
      // Don't fail registration if email fails - user can request password reset
      // But log the error for monitoring
    }

    // Return success (no token - user must login first)
    res.json({
      message: "Account created successfully. Please check your email for your temporary password.",
      email: user.email,
    });
  } catch (error: any) {
    console.error("Error registering user:", error);
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

    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Check if user has temp password or regular password
    let isValidPassword = false;
    let isTempPassword = false;

    if (user.temp_password_hash) {
      // Check temp password
      isValidPassword = await bcrypt.compare(password, user.temp_password_hash);
      isTempPassword = isValidPassword;
    }

    if (!isValidPassword && user.password_hash) {
      // Check regular password
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user data with password change requirement flag
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
      requiresPasswordChange: user.requires_password_change || false,
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

    res.json({
      message: "Password changed successfully",
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

// Cleanup expired accounts (can be called via cron job)
router.post("/cleanup-expired-accounts", async (req, res) => {
  try {
    // Optional: Add authentication/authorization for this endpoint
    // For now, it's open but should be protected in production
    
    const deletedCount = await deleteExpiredAccounts();
    
    res.json({
      message: "Cleanup completed",
      deletedAccounts: deletedCount,
    });
  } catch (error: any) {
    console.error("Error cleaning up expired accounts:", error);
    res.status(500).json({ error: error.message || "Failed to cleanup expired accounts" });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default router;
