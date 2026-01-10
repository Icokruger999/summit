import { useState } from "react";

interface RecordingConfig {
  output_path: string;
  video_track_id?: string;
  audio_track_id?: string;
}

// Check if running in Tauri
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  const startRecording = async (config: RecordingConfig) => {
    if (!isTauri) {
      console.warn("Recording only available in Tauri desktop app");
      return "Recording not available in browser";
    }
    
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<string>("start_recording", { config });
      setIsRecording(true);
      setOutputPath(config.output_path);
      return result;
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  };

  const stopRecording = async () => {
    if (!isTauri) {
      console.warn("Recording only available in Tauri desktop app");
      return "Recording not available in browser";
    }
    
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<string>("stop_recording");
      setIsRecording(false);
      return result;
    } catch (error) {
      console.error("Error stopping recording:", error);
      throw error;
    }
  };

  const getStatus = async () => {
    if (!isTauri) {
      return false;
    }
    
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const status = await invoke<boolean>("get_recording_status");
      setIsRecording(status);
      return status;
    } catch (error) {
      console.error("Error getting recording status:", error);
      return false;
    }
  };

  return {
    isRecording,
    outputPath,
    startRecording,
    stopRecording,
    getStatus,
  };
}

