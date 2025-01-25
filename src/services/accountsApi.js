import supabase from "./supabase";

export async function getAccounts() {
  const { data, error } = await supabase.from("accounts").select("*");
  if (error) {
    console.log("error", error);
    throw new Error("An error occurred while fetching accounts.");
  }
  return data;
}
