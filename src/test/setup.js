import "@testing-library/jest-dom/vitest";
import { assertNotProdSupabase } from "../utils/prodGuard";

// Hard stop: tests must never run against the live production database.
assertNotProdSupabase(import.meta.env?.VITE_SUPABASE_URL);
