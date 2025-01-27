import supabase from "./supabase";

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data) {
    throw new Error("Invalid user or password");
  }

  return data.user;
}

export const logout = async () => {
  let { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
};

export async function getCurrentUser() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(userError?.message || "No user found");
    return null;
  }

  // Fetch the user's profile to get additional details like 'role' and 'username'
  const { data: profile, error: profileError } = await supabase
    .from("profiles") // Ensure you have a 'profiles' table linked to your 'users' table
    .select("role, username")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.log("Error fetching user profile:", profileError);
    return null;
  }

  return { ...user, role: profile.role, username: profile.username };
}
