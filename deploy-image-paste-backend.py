#!/usr/bin/env python3
"""
Deploy image paste backend changes to EC2
- Adds S3 upload route
- Updates server index with uploads route
- Installs @aws-sdk/client-s3
"""

import boto3
import time

# EC2 Configuration
INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

# Initialize SSM client
ssm = boto3.client("ssm", region_name=REGION)

def run_command(command, comment):
    """Execute command via SSM"""
    print(f"\n{'='*60}")
    print(f"📝 {comment}")
    print(f"{'='*60}")
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": [command]},
        Comment=comment
    )
    
    command_id = response["Command"]["CommandId"]
    print(f"⏳ Command ID: {command_id}")
    
    # Wait for command to complete
    time.sleep(3)
    
    # Get command output
    try:
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        if output["StandardOutputContent"]:
            print(f"\n✅ Output:\n{output['StandardOutputContent']}")
        if output["StandardErrorContent"]:
            print(f"\n⚠️  Errors:\n{output['StandardErrorContent']}")
            
        return output["Status"] == "Success"
    except Exception as e:
        print(f"❌ Error getting output: {e}")
        return False

def main():
    print("🚀 Deploying Image Paste Backend Changes")
    print(f"📍 Instance: {INSTANCE_ID}")
    print(f"🌍 Region: {REGION}")
    
    # Step 1: Install S3 SDK
    if not run_command(
        "cd /var/www/summit && npm install @aws-sdk/client-s3",
        "Installing AWS S3 SDK"
    ):
        print("❌ Failed to install S3 SDK")
        return
    
    # Step 2: Create uploads route file
    uploads_route = '''import { Router, Request, Response } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import crypto from "crypto";

const router = Router();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const S3_BUCKET = process.env.S3_BUCKET_NAME || "summit-chat-uploads";

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post("/image", authenticate, upload.single("image"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileExtension = req.file.originalname.split(".").pop();
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${fileExtension}`;
    const s3Key = `chat-images/${uniqueFilename}`;

    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read" as const,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

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

export default router;'''
    
    # Write uploads route (escape single quotes)
    escaped_route = uploads_route.replace("'", "'\\''")
    if not run_command(
        f"echo '{escaped_route}' > /var/www/summit/dist/routes/uploads.js",
        "Creating uploads route"
    ):
        print("❌ Failed to create uploads route")
        return
    
    # Step 3: Add uploads route to index.js
    if not run_command(
        """cd /var/www/summit/dist && sed -i '/import chimeRoutes from/a import uploadsRoutes from "./routes/uploads.js";' index.js""",
        "Adding uploads import to index.js"
    ):
        print("❌ Failed to add uploads import")
        return
    
    if not run_command(
        """cd /var/www/summit/dist && sed -i '/app.use("\\/api\\/chime", chimeRoutes);/a app.use("/api/uploads", uploadsRoutes);' index.js""",
        "Adding uploads route to index.js"
    ):
        print("❌ Failed to add uploads route")
        return
    
    # Step 4: Restart PM2
    if not run_command(
        "export HOME=/home/ubuntu && pm2 restart summit-backend",
        "Restarting PM2"
    ):
        print("❌ Failed to restart PM2")
        return
    
    # Step 5: Check PM2 status
    run_command(
        "export HOME=/home/ubuntu && pm2 status",
        "Checking PM2 status"
    )
    
    print("\n" + "="*60)
    print("✅ Backend deployment complete!")
    print("="*60)
    print("\n📋 Next steps:")
    print("1. Set up S3 bucket (see S3_SETUP_GUIDE.md)")
    print("2. Add S3 environment variables to .env")
    print("3. Deploy frontend changes")
    print("4. Test image upload")

if __name__ == "__main__":
    main()
