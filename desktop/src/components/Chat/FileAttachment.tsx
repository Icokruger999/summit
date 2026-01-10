import { useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { getAuthToken } from "../../lib/api";

interface FileAttachmentProps {
  onFileSent: (fileUrl: string, fileName: string, fileType: string) => void;
}

export default function FileAttachment({ onFileSent }: FileAttachmentProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const SERVER_URL = import.meta.env.VITE_SERVER_URL;
      if (!SERVER_URL) {
        alert("Server URL not configured. Please contact support.");
        return;
      }
      const token = getAuthToken();
      
      if (!token) {
        alert("Not authenticated");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${SERVER_URL}/api/files/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        onFileSent(data.url, data.fileName, data.type);
        setProgress(100);
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset input
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <label
        htmlFor="file-upload"
        className={`inline-flex items-center justify-center p-3 rounded-xl cursor-pointer transition-all ${
          uploading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-indigo-600"
        }`}
        title={uploading ? `Uploading... ${progress}%` : "Attach File"}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Paperclip className="w-5 h-5" />
        )}
      </label>
    </div>
  );
}
