import supabase from "./supabase";

export async function getCampaigns() {
  const { data, error } = await supabase.from("campaigns").select("*");
  if (error) {
    console.log(error);
    throw new Error(error.message);
  }
  return data;
}
