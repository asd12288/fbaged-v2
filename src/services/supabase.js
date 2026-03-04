import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_URL = supabaseUrl;
const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
