/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_LIVEKIT_URL?: string;
  readonly VITE_LIVEKIT_TOKEN?: string;
  readonly VITE_ASSETS_MANIFEST_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


