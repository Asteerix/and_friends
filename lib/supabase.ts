import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

console.log("[supabase.ts] Initializing Supabase client...");

const envSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("[supabase.ts] EXPO_PUBLIC_SUPABASE_URL from env:", envSupabaseUrl);
console.log("[supabase.ts] EXPO_PUBLIC_SUPABASE_ANON_KEY from env:", envSupabaseAnonKey);

// Récupère les secrets depuis .env ou en dur pour test local
const supabaseUrl =
  envSupabaseUrl ||
  "https://YOUR_PROJECT_URL.supabase.co";
const supabaseAnonKey =
  envSupabaseAnonKey || "YOUR_ANON_PUBLIC_KEY";

console.log("[supabase.ts] Using Supabase URL:", supabaseUrl);
console.log("[supabase.ts] Using Supabase Anon Key:", supabaseAnonKey);


if (supabaseUrl === "https://YOUR_PROJECT_URL.supabase.co" || supabaseAnonKey === "YOUR_ANON_PUBLIC_KEY") {
  console.warn("[supabase.ts] WARNING: Supabase is using fallback URL or Anon Key. Check your .env file and ensure EXPO_PUBLIC_ prefixed variables are loaded.");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
