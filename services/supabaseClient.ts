import { createClient } from '@supabase/supabase-js';

// Helper to check standard process.env and Vite's import.meta.env
const getEnvVar = (key: string): string => {
  // Check process.env (Standard/CRA/Next)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Check import.meta.env (Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return '';
};

// Hardcoded defaults from your provided project
const DEFAULT_URL = 'https://jiaoquvacajifnrgingm.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppYW9xdXZhY2FqaWZucmdpbmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjg0ODMsImV4cCI6MjA4MDgwNDQ4M30.ku2mpXDM41YyjLckG5k4HkaLO3X6G7NIjvFKNLaxR1E';

const rawUrl = getEnvVar('SUPABASE_URL') || getEnvVar('VITE_SUPABASE_URL') || DEFAULT_URL;
const rawKey = getEnvVar('SUPABASE_KEY') || getEnvVar('VITE_SUPABASE_KEY') || DEFAULT_KEY;

// Use placeholders if missing to prevent createClient crash, but isSupabaseConfigured will be false
const supabaseUrl = rawUrl || 'https://placeholder.supabase.co';
const supabaseKey = rawKey || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Robust check to determine if we should actually attempt DB calls
export const isSupabaseConfigured = 
  !!rawUrl && 
  !!rawKey && 
  rawUrl !== 'https://your-project.supabase.co' &&
  !rawUrl.includes('placeholder') &&
  rawUrl.startsWith('http');