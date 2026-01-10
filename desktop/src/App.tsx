import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./auth/Login";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import ProfileWrapper from "./components/ProfileWrapper";
import AssetDownloader from "./components/Installer/AssetDownloader";
import PermissionsRequest from "./components/PermissionsRequest";
import FirstLoginPopup from "./components/FirstLoginPopup";
import { authApi, getAuthToken } from "./lib/api";

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assetsInstalled, setAssetsInstalled] = useState<boolean | null>(null);
  const [downloadingAssets, setDownloadingAssets] = useState(false);
  const [showPermissionsRequest, setShowPermissionsRequest] = useState(false);
  const [showFirstLoginPopup, setShowFirstLoginPopup] = useState(false);

  useEffect(() => {
    // Check if assets are installed (only in Tauri)
    const checkAssets = async () => {
      // Skip asset check for now - always assume installed
      // This can be enabled later when asset manifest is set up
      setAssetsInstalled(true);
      
      // Uncomment below when ready to use asset downloader
      /*
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        try {
          const installed = await invoke<boolean>("check_assets_installed");
          setAssetsInstalled(installed);
          
          if (!installed) {
            setDownloadingAssets(true);
          }
        } catch (error) {
          console.error("Failed to check assets:", error);
          // Assume installed if check fails (for development)
          setAssetsInstalled(true);
        }
      } else {
        // Browser mode - skip asset check
        setAssetsInstalled(true);
      }
      */
    };

    checkAssets();
  }, []);

  useEffect(() => {
    // Only check auth if assets are installed
    if (assetsInstalled === false) return;

    // Check if permissions have been requested before
    const permissionsRequested = localStorage.getItem("permissions_requested") === "true";
    
    // Check for stored user and token
    const storedUser = localStorage.getItem("user");
    const token = getAuthToken();

    if (storedUser && token) {
      try {
        const userData = JSON.parse(storedUser);
        // Set user immediately from localStorage (optimistic)
        setUser(userData);
        setLoading(false);
        
        // Verify token is still valid in the background
        authApi.getMe()
          .then((currentUser) => {
            // Update with fresh user data from server
            setUser(currentUser);
            localStorage.setItem("user", JSON.stringify(currentUser));
            
            // Check if first login popup should be shown
            const accountJustCreated = localStorage.getItem("account_just_created") === "true";
            const popupShown = localStorage.getItem(`first_login_popup_shown_${currentUser.id}`) === "true";
            
            if (accountJustCreated && !popupShown) {
              setShowFirstLoginPopup(true);
            } else if (!permissionsRequested) {
              setShowPermissionsRequest(true);
            }
          })
          .catch((error) => {
            // Only clear if token is actually invalid (401), not network errors
            const statusCode = error.response?.status;
            if (statusCode === 401 || statusCode === 403) {
              // Token invalid, clear storage
              localStorage.removeItem("user");
              localStorage.removeItem("auth_token");
              setUser(null);
            } else {
              // Network error or other issue - keep user logged in
              console.warn("Could not verify token, but keeping user logged in:", error);
              // Still show permissions request if not requested before
              if (!permissionsRequested) {
                setShowPermissionsRequest(true);
              }
            }
          });
      } catch (e) {
        localStorage.removeItem("user");
        localStorage.removeItem("auth_token");
        setUser(null);
        setLoading(false);
      }
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [assetsInstalled]);

  // Show asset downloader if assets not installed
  if (downloadingAssets && assetsInstalled === false) {
    const MANIFEST_URL = import.meta.env.VITE_ASSETS_MANIFEST_URL || 
      "https://your-cdn.com/summit/assets/manifest.json";
    
    return (
      <AssetDownloader
        manifestUrl={MANIFEST_URL}
        onComplete={() => {
          setAssetsInstalled(true);
          setDownloadingAssets(false);
        }}
        onError={(error) => {
          console.error("Asset download error:", error);
          // Allow app to continue even if download fails (for development)
          setAssetsInstalled(true);
          setDownloadingAssets(false);
        }}
      />
    );
  }

  if (loading || assetsInstalled === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50">
        <div className="text-center max-w-md w-full px-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg font-medium text-gray-700">Loading Summit...</p>
        </div>
      </div>
    );
  }

  // Show first login popup if account was just created
  if (showFirstLoginPopup && user) {
    return (
      <FirstLoginPopup
        userId={user.id}
        onComplete={() => {
          localStorage.removeItem("account_just_created");
          setShowFirstLoginPopup(false);
          // Check if permissions should be shown after popup
          const permissionsRequested = localStorage.getItem("permissions_requested") === "true";
          if (!permissionsRequested) {
            setShowPermissionsRequest(true);
          }
        }}
      />
    );
  }

  // Show permissions request on first startup
  if (showPermissionsRequest && user) {
    return (
      <PermissionsRequest
        onComplete={() => setShowPermissionsRequest(false)}
      />
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings"
          element={user ? <Settings user={user} onSignOut={() => {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
            window.location.href = "/login";
          }} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile/:userId?"
          element={user ? <ProfileWrapper user={user} /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

