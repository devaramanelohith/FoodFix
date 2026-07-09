/// <reference types="vite/client" />

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Explicit static references for Vite's compiler to see and replace during build.
// DO NOT use dynamic index signatures (like env[key]) as Vite will not replace them.
const viteSupabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const viteSupabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

const getProcessEnv = (key: string): string => {
  return typeof process !== 'undefined' ? (process.env[key] || '') : '';
};

// Retrieve from localStorage if available
const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('SB_URL') : '';
const savedKey = typeof window !== 'undefined' ? localStorage.getItem('SB_KEY') : '';

let supabaseUrl = savedUrl || viteSupabaseUrl || getProcessEnv('VITE_SUPABASE_URL') || getProcessEnv('SUPABASE_URL');
let supabaseAnonKey = savedKey || viteSupabaseKey || getProcessEnv('VITE_SUPABASE_ANON_KEY') || getProcessEnv('SUPABASE_ANON_KEY');

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export async function initSupabaseFromServer(): Promise<boolean> {
  if (client) return true; // Already initialized

  try {
    const response = await fetch('/api/supabase-config');
    const data = await response.json();
    if (data.supabaseUrl && data.supabaseAnonKey) {
      supabaseUrl = data.supabaseUrl;
      supabaseAnonKey = data.supabaseAnonKey;
      client = createClient(supabaseUrl, supabaseAnonKey);
      if (typeof window !== 'undefined') {
        localStorage.setItem('SB_URL', supabaseUrl);
        localStorage.setItem('SB_KEY', supabaseAnonKey);
      }
      return true;
    }
  } catch (err) {
    console.error('Error fetching Supabase configuration from server:', err);
  }
  return false;
}

export function configureSupabase(url: string, key: string): boolean {
  if (!url || !key) return false;
  try {
    client = createClient(url, key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('SB_URL', url);
      localStorage.setItem('SB_KEY', key);
    }
    // Force reload to apply new config across the app
    window.location.reload();
    return true;
  } catch (err) {
    console.error('Error manually initializing Supabase:', err);
    return false;
  }
}

export function clearSupabaseConfig() {
  client = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('SB_URL');
    localStorage.removeItem('SB_KEY');
  }
  window.location.reload();
}

// Dummy client to prevent null errors while indicating it's not functional
const dummyClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: async () => ({ data: null, error: new Error('Supabase not configured') }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
    signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
    signOut: async () => ({ error: null }),
  },
} as unknown as SupabaseClient;

export const supabase = {
  get auth() {
    return client ? client.auth : dummyClient.auth;
  }
} as unknown as SupabaseClient;

export const isSupabaseConfigured = () => !!client;
export const getSupabaseConfigDetails = () => ({
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey
});
