import supabase from "./supabase";

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data) {
    throw new Error("Invalid user or password");
  }

  return data;
}

export const logout = async () => {
  let { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No user found");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  return { ...user, role: profile?.role, username: profile?.username };
};
