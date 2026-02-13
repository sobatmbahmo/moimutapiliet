import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables (NEVER hardcode in source!)
// For Vite projects, use import.meta.env.VITE_* variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Validate that credentials are provided
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Supabase credentials not found in environment variables!');
  console.error('Please add VITE_SUPABASE_URL and VITE_SUPABASE_KEY to .env file');
  throw new Error('Supabase configuration missing');
}

export const supabase = createClient(supabaseUrl, supabaseKey);