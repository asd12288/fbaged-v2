import supabase from "./supabase";

export async function getDeposits() {
  const { data, error } = await supabase.from("deposits").select("*");
  if (error) {
    console.log("depositsApi.js: getDeposits error", error.message);
    throw new Error(error.message);
  }
  return data;
}
