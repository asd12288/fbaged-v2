import { createClient } from "@supabase/supabase-js";
export const SUPABASE_URL = "https://padrhwykbrioohogickg.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZHJod3lrYnJpb29ob2dpY2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NzkxMjIsImV4cCI6MjA1MzU1NTEyMn0.y8l5gJMslTo-t8PzMzrNYA_ZnlyV8FdaWAKMkSf0Y8g";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default supabase;
