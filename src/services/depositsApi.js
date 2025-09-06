import supabase from "./supabase";

// For regular users, restrict to their own deposits; admins see all.
// If filterUserId is provided, always scope to that user (admin dashboard use-case).
export async function getDeposits({ userId, isAdmin, filterUserId } = {}) {
  let query = supabase.from("deposits").select("*");
  if (filterUserId) query = query.eq("user_id", filterUserId);
  else if (!isAdmin && userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) {
    console.log("depositsApi.js: getDeposits error", error.message);
    throw new Error(error.message);
  }
  return data;
}

// Admin creates must include user_id of the target user; users typically cannot write.
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
