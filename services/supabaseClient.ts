import { createClient, SupabaseClient } from '@supabase/supabase-js';

const HARDCODED_URL = 'https://jnxgnizageyipfuobukv.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueGduaXphZ2V5aXBmdW9idWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMTU5OTYsImV4cCI6MjA3OTg5MTk5Nn0.M7pRocDZkdSxF1lxJ_x0ugqTAGB0kgvMhpxVwVyLRzk';

const STORAGE_KEY_URL = 'mycotrack_sb_url';
const STORAGE_KEY_KEY = 'mycotrack_sb_key';

let supabaseInstance: SupabaseClient | null = null;

export const isConfigured = (): boolean => {
  if (HARDCODED_URL && HARDCODED_KEY) return true;
  
  const storedUrl = localStorage.getItem(STORAGE_KEY_URL);
  const storedKey = localStorage.getItem(STORAGE_KEY_KEY);
  return !!storedUrl && !!storedKey && storedUrl.includes('supabase.co');
};

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  if (HARDCODED_URL && HARDCODED_KEY) {
    supabaseInstance = createClient(HARDCODED_URL, HARDCODED_KEY);
    return supabaseInstance;
  }

  const storedUrl = localStorage.getItem(STORAGE_KEY_URL);
  const storedKey = localStorage.getItem(STORAGE_KEY_KEY);

  supabaseInstance = createClient(
    storedUrl || 'https://setup-required.supabase.co',
    storedKey || 'placeholder-key'
  );

  return supabaseInstance;
};

export const saveSupabaseConfig = (url: string, key: string): boolean => {
  const cleanUrl = url.trim().replace(/\/$/, '');
  const cleanKey = key.trim();

  if (!cleanUrl || !cleanKey) return false;
  
  localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
  localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
  
  supabaseInstance = null;
  return true;
};

export const checkConnection = async (url: string, key: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const cleanUrl = url.trim().replace(/\/$/, '');
    const cleanKey = key.trim();
    const tempClient = createClient(cleanUrl, cleanKey);
    const { error } = await tempClient.auth.getSession();
    
    if (error) return { success: false, message: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message || "Connection failed" };
  }
};

export const resetSupabaseConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  supabaseInstance = null;
};