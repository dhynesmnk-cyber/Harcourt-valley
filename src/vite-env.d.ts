/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Both must be set for the app to talk to Postgres; absent means demo mode. */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
