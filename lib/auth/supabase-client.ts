import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = 'https://uvfjofawxsmrdpaxxptg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmpvZmF3eHNtcmRwYXh4cHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3OTY4MzMsImV4cCI6MjA2OTM3MjgzM30.TIl5VqYKEacKb6Otzm22LNdS8b7hF2W4A7cRhM7-0k0'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}