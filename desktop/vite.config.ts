import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Check if running in Tauri mode
const isTauri = process.env.TAURI_PLATFORM !== undefined;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Server config - different for web vs Tauri
  clearScreen: false,
  server: isTauri
    ? {
        // Tauri expects a fixed port, fail if that port is not available
        port: 1420,
        strictPort: true,
        watch: {
          // Tell Vite to ignore watching `src-tauri`
          ignored: ["**/src-tauri/**"],
        },
      }
    : {
        // Web mode - flexible port, default 5173
        port: 5173,
        strictPort: false,
        host: true, // Allow external connections for network access
      },

  // Build config for web deployment
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          livekit: ["livekit-client"],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  
  // Optimize dependencies - exclude Tauri for web builds
  optimizeDeps: {
    exclude: isTauri ? [] : [
      '@tauri-apps/api',
      '@tauri-apps/cli',
      '@tauri-apps/plugin-notification',
    ],
  },
}));
