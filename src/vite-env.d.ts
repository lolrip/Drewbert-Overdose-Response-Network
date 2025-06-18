/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_Maps_API_KEY: string // Changed from VITE_GEOCODE_API_KEY
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_OPENAI_ASSISTANT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
