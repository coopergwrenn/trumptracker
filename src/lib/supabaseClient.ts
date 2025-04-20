import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

// Get the current domain safely
let domain;
try {
  domain = window.location.origin;
} catch (error) {
  console.error('Failed to get domain:', error);
  domain = 'https://trumptracker-git-main-cooper-wrenns-projects.vercel.app';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'trump-tracker-auth',
    // Set site URL for auth redirects
    site: domain,
  },
  global: {
    headers: {
      'x-application-name': 'trump-tracker',
    },
  },
});

// Log auth events in development
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
    console.log('Session:', session);
  });
}