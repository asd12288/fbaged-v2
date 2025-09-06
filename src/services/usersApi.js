import supabase from "./supabase";

export async function getAllUsers() {
  try {
    // Try to query auth.users view directly with profiles join
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        username,
        role,
        created_at,
        auth.users!inner(email)
      `);
      
    if (data) {
      // If the join works, format the data
      const formattedData = data.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        created_at: user.created_at,
        email: user.auth?.users?.email || 'Email not found'
      }));
      return formattedData;
    }
  } catch (joinError) {
    console.log("Join query failed, trying alternative approach:", joinError);
  }

  try {
    // Alternative: Try auth.users table directly
    const { data, error } = await supabase
      .from("auth.users")
      .select(`
        id,
        email,
        created_at,
        profiles!inner(username, role)
      `);
      
    if (data) {
      const formattedData = data.map(user => ({
        id: user.id,
        email: user.email,
        username: user.profiles?.username || 'No username',
        role: user.profiles?.role || 'user',
        created_at: user.profiles?.created_at || user.created_at
      }));
      return formattedData;
    }
  } catch (authError) {
    console.log("Auth.users query failed, using admin API:", authError);
  }

  // Fallback to admin API approach
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, role, created_at");
    
  if (profileError) {
    console.log("Profile error", profileError);
    throw new Error("An error occurred while fetching user profiles.");
  }

  if (!profiles || profiles.length === 0) {
    return [];
  }

  // Use admin API to get emails
  const usersWithEmail = await Promise.all(
    profiles.map(async (profile) => {
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);
        
        return {
          id: profile.id,
          username: profile.username,
          role: profile.role,
          created_at: profile.created_at,
          email: authUser?.user?.email || 'No email found'
        };
      } catch (error) {
        console.log(`Error fetching auth data for user ${profile.id}:`, error);
        return {
          id: profile.id,
          username: profile.username,
          role: profile.role,
          created_at: profile.created_at,
          email: 'Email unavailable'
        };
      }
    })
  );

  return usersWithEmail;
}

export async function createUser({ email, password, username, role = "user" }) {
  // First, create the auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    console.log("Auth error", authError);
    throw new Error(authError.message || "An error occurred while creating the user.");
  }

  // Then, create or update the profile
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: authData.user.id,
      username,
      role
    })
    .select()
    .single();

  if (profileError) {
    console.log("Profile error", profileError);
    throw new Error("An error occurred while creating the user profile.");
  }

  return { ...profileData, email };
}

export async function updateUser(id, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.log("error", error);
    throw new Error("An error occurred while updating the user.");
  }
  
  return data;
}

export async function deleteUser(id) {
  // First delete the profile
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id);
    
  if (profileError) {
    console.log("Profile delete error", profileError);
    throw new Error("An error occurred while deleting the user profile.");
  }
  
  // Then delete the auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  
  if (authError) {
    console.log("Auth delete error", authError);
    throw new Error("An error occurred while deleting the user account.");
  }
  
  return true;
}