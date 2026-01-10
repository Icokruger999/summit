import { useEffect, useState } from "react";
import { Download, CheckCircle, AlertCircle, Loader } from "lucide-react";

// Check if running in Tauri
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
}

interface AssetDownloaderProps {
  manifestUrl: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

export default function AssetDownloader({
  manifestUrl,
  onComplete,
  onError,
}: AssetDownloaderProps) {
  const [progress, setProgress] = useState<DownloadProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    status: "Initializing...",
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<DownloadProgress>(
          "download-progress",
          (event) => {
            setProgress(event.payload);
          }
        );
      } catch (err) {
        console.error("Failed to setup progress listener:", err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const startDownload = async () => {
    setIsDownloading(true);
    setError(null);
    setProgress({
      current: 0,
      total: 0,
      percentage: 0,
      status: "Starting download...",
    });

    try {
      if (isTauri) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("download_app_assets", { manifestUrl });
      } else {
        // Browser mode - skip download
        console.warn("Asset downloader only works in Tauri desktop app");
      }
      onComplete();
    } catch (err: any) {
      const errorMsg = err.message || "Failed to download assets";
      setError(errorMsg);
      onError(errorMsg);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Installing Summit
          </h2>
          <p className="text-gray-600">
            Downloading all assets and components...
          </p>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">Download Error</p>
            </div>
            <p className="text-sm text-red-600 mt-2">{error}</p>
            <button
              onClick={startDownload}
              className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry Download
            </button>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {progress.status}
                </span>
                <span className="text-sm text-gray-500">
                  {progress.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 ease-out flex items-center justify-end pr-2"
                  style={{ width: `${progress.percentage}%` }}
                >
                  {progress.percentage > 10 && (
                    <Loader className="w-2 h-2 text-white animate-spin" />
                  )}
                </div>
              </div>
              {progress.total > 0 && (
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{formatBytes(progress.current)}</span>
                  <span>{formatBytes(progress.total)}</span>
                </div>
              )}
            </div>

            {/* Status Message */}
            <div className="text-center">
              {!isDownloading && progress.percentage === 0 && (
                <button
                  onClick={startDownload}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  Start Download
                </button>
              )}
              {isDownloading && progress.percentage < 100 && (
                <p className="text-sm text-gray-600 animate-pulse">
                  {progress.status}
                </p>
              )}
              {progress.percentage === 100 && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-medium">Download Complete!</p>
                </div>
              )}
            </div>
          </>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Summit by Coding Everest
        </p>
      </div>
    </div>
  );
}

