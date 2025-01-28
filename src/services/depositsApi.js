import supabase from "./supabase";

export async function getDeposits() {
  const { data, error } = await supabase.from("deposits").select("*");
  if (error) {
    console.log("depositsApi.js: getDeposits error", error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function createDeposit(deposit) {
  const { data, error } = await supabase.from("deposits").insert([deposit]);
  if (error) {
    console.log("depositsApi.js: createDeposit error", error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function updateDeposit(id, updatedDeposit) {
  const { data, error } = await supabase
    .from("deposits")
    .update(updatedDeposit)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDeposit(id) {
  const { data, error } = await supabase.from("deposits").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return data;
}
