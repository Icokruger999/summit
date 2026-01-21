import { Router, Request, Response } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import crypto from "crypto";

const router = Router();

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const S3_BUCKET = process.env.S3_BUCKET_NAME || "summit-chat-uploads";

// Configure multer for memory storage (we'll upload to S3 directly)
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Upload image endpoint
router.post("/image", authenticate, upload.single("image"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${fileExtension}`;
    const s3Key = `chat-images/${uniqueFilename}`;

    // Upload to S3
    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      // Make the file publicly readable (or use signed URLs for private access)
      ACL: "public-read" as const,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Construct the public URL
    const fileUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${s3Key}`;
    
    console.log(`✅ Image uploaded to S3: ${fileUrl}`);

    res.json({
      success: true,
      file: {
        filename: uniqueFilename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl
      }
    });
  } catch (error: any) {
    console.error("Error uploading file to S3:", error);
    res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

export default router;
