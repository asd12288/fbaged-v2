import supabase from "./supabase";

export async function getAccounts() {
  const { data, error } = await supabase.from("accounts").select("*");
  if (error) {
    console.log("error", error);
    throw new Error("An error occurred while fetching accounts.");
  }
  return data;
}

export async function createAccount(account) {
  const { data, error } = await supabase
    .from("accounts")
    .insert([account])
    .single();

  if (error) {
    console.log("error", error);
    throw new Error("An error occurred while creating the account.");
  }
  return data;
}

export async function updateAccount(id, updatedAccount) {
  const { data, error } = await supabase
    .from("accounts")
    .update(updatedAccount)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error("An error occurred while updating the account.");
  return data;
}

export async function deleteAccount(id) {
  const { data, error } = await supabase.from("accounts").delete().eq("id", id);
  
  if (error) throw new Error("An error occurred while deleting the account.");
  return data;
}
