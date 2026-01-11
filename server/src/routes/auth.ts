import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail, createUser, getUserById } from "../lib/supabase.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser(email, passwordHash, name);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
      token,
    });
  } catch (error: any) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: error.message });
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

    // Check password
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

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
      token,
    });
  } catch (error: any) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };

    const user = await getUserById(decoded.id);
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
    });
  } catch (error: any) {
    console.error("Error getting user:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default router;
