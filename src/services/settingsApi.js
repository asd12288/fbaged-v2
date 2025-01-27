import supabase from "./supabase";

export async function getMaintenanceSetting() {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateMaintenanceSetting(newValue) {
  const { data, error } = await supabase
    .from("settings")
    .update({ isMaintenanceMode: newValue })
    .eq("id", 1)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
