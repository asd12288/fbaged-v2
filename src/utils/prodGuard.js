// The live production Supabase project. Nothing under test/dev may target it.
export const PROD_SUPABASE_REF = "padrhwykbrioohogickg"; // NOSONAR — intentional hardcoded guard, not a secret

export function isProdSupabaseUrl(url) {
  if (!url) return false;
  return String(url).includes(PROD_SUPABASE_REF);
}

export function assertNotProdSupabase(url) {
  if (isProdSupabaseUrl(url)) {
    throw new Error(
      `Refusing to run against the production Supabase project (${PROD_SUPABASE_REF}). ` +
        `Use a local stack (supabase start) or mocks.`
    );
  }
}
