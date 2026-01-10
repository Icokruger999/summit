import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getUserById } from "../lib/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      
      // Get user from database
      const user = await getUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
      };

      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error: any) {
    console.error("Auth error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}
