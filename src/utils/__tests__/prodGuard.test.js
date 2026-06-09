import { describe, it, expect } from "vitest";
import { isProdSupabaseUrl, assertNotProdSupabase, PROD_SUPABASE_REF } from "../prodGuard";

describe("prodGuard", () => {
  it("flags the known prod project ref", () => {
    expect(isProdSupabaseUrl(`https://${PROD_SUPABASE_REF}.supabase.co`)).toBe(true);
  });

  it("treats local and empty urls as safe", () => {
    expect(isProdSupabaseUrl("http://127.0.0.1:54321")).toBe(false);
    expect(isProdSupabaseUrl(undefined)).toBe(false);
    expect(isProdSupabaseUrl("")).toBe(false);
  });

  it("assert throws on prod, passes on local", () => {
    expect(() => assertNotProdSupabase(`https://${PROD_SUPABASE_REF}.supabase.co`)).toThrow(
      /production/i
    );
    expect(() => assertNotProdSupabase("http://127.0.0.1:54321")).not.toThrow();
  });
});
