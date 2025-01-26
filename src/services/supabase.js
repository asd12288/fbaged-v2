import { createClient } from "@supabase/supabase-js";
export const supabaseUrl = "https://exbhmlnlbogcwxluypiv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YmhtbG5sYm9nY3d4bHV5cGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDMyODgsImV4cCI6MjA1Mjk3OTI4OH0.DlBwWaJybE5sIbngCuyXOt4oExtkW2nwTE1vevQajYA";
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
