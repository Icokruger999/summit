#!/usr/bin/env python3
"""
Simple deployment of S3 backend changes
"""

import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client("ssm", region_name=REGION)

def run_command(commands, comment):
    """Execute command via SSM"""
    print(f"\n{'='*60}")
    print(f"📝 {comment}")
    print(f"{'='*60}")
    
    if isinstance(commands, str):
        commands = [commands]
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": commands},
        Comment=comment
    )
    
    command_id = response["Command"]["CommandId"]
    print(f"⏳ Command ID: {command_id}")
    
    # Wait for command to complete
    time.sleep(5)
    
    # Get command output
    try:
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        print(f"\n📊 Status: {output['Status']}")
        if output["StandardOutputContent"]:
            print(f"\n✅ Output:\n{output['StandardOutputContent']}")
        if output["StandardErrorContent"]:
            print(f"\n⚠️  Errors:\n{output['StandardErrorContent']}")
            
        return output["Status"] == "Success"
    except Exception as e:
        print(f"❌ Error getting output: {e}")
        return False

def main():
    print("🚀 Deploying S3 Backend - Simple Method")
    
    # Step 1: Install S3 SDK
    print("\n" + "="*60)
    print("Step 1: Installing @aws-sdk/client-s3")
    print("="*60)
    
    run_command([
        "cd /var/www/summit",
        "npm install @aws-sdk/client-s3"
    ], "Install S3 SDK")
    
    # Step 2: Create uploads.js file
    print("\n" + "="*60)
    print("Step 2: Creating uploads route")
    print("="*60)
    
    # Create the file content (already compiled JS, not TS)
    uploads_js = """import { Router } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { authenticate } from "../middleware/auth.js";
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

const fileFilter = (req, file, cb) => {
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

router.post("/image", authenticate, upload.single("image"), async (req, res) => {
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
      ACL: "public-read",
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
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

export default router;"""
    
    # Write the file
    run_command([
        f'cat > /var/www/summit/dist/routes/uploads.js << \'EOF\'\n{uploads_js}\nEOF'
    ], "Create uploads.js")
    
    # Step 3: Update index.js to import uploads
    print("\n" + "="*60)
    print("Step 3: Adding uploads route to index.js")
    print("="*60)
    
    run_command([
        'cd /var/www/summit/dist',
        'grep -q "uploadsRoutes" index.js || sed -i \'/import chimeRoutes from/a import uploadsRoutes from "./routes/uploads.js";\' index.js',
        'grep -q \'app.use("/api/uploads"\' index.js || sed -i \'/app.use("\\/api\\/chime", chimeRoutes);/a app.use("/api/uploads", uploadsRoutes);\' index.js'
    ], "Update index.js")
    
    # Step 4: Restart PM2
    print("\n" + "="*60)
    print("Step 4: Restarting PM2")
    print("="*60)
    
    run_command([
        "export HOME=/home/ubuntu",
        "pm2 restart summit-backend"
    ], "Restart PM2")
    
    # Step 5: Check status
    print("\n" + "="*60)
    print("Step 5: Checking PM2 status")
    print("="*60)
    
    run_command([
        "export HOME=/home/ubuntu",
        "pm2 status"
    ], "PM2 Status")
    
    print("\n" + "="*60)
    print("✅ Backend Deployment Complete!")
    print("="*60)
    print("\n📋 Next steps:")
    print("1. Verify AWS credentials are in .env file:")
    print("   - AWS_REGION=eu-west-1")
    print("   - AWS_ACCESS_KEY_ID=...")
    print("   - AWS_SECRET_ACCESS_KEY=...")
    print("   - S3_BUCKET_NAME=summit-chat-uploads")
    print("\n2. Test the upload endpoint:")
    print("   curl -X POST https://summit.api.codingeverest.com/api/uploads/image \\")
    print("     -H 'Authorization: Bearer YOUR_TOKEN' \\")
    print("     -F 'image=@test.jpg'")
    print("\n3. Deploy frontend changes")

if __name__ == "__main__":
    main()
