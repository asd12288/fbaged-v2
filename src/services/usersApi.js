import supabase from "./supabase";
import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from "@supabase/supabase-js";

export async function getAllUsers() {
  // Preferred: call secure SQL function exposed for admins
  try {
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) throw error;
    if (Array.isArray(data)) return data;
  } catch (e) {
    console.log("admin_list_users RPC failed, falling back:", e?.message || e);
  }

  // Fallback path retains previous behavior in case RPC unavailable
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`id, username, role, created_at`);
    if (error) throw error;

    if (!data?.length) return [];

    const usersWithEmail = await Promise.all(
      data.map(async (profile) => {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            profile.id
          );
          return {
            id: profile.id,
            username: profile.username,
            role: profile.role,
            created_at: profile.created_at,
            email: authUser?.user?.email || "No email found",
          };
        } catch (error) {
          console.log(
            `Error fetching auth data for user ${profile.id}:`,
            error
          );
          return {
            id: profile.id,
            username: profile.username,
            role: profile.role,
            created_at: profile.created_at,
            email: "Email unavailable",
          };
        }
      })
    );

    return usersWithEmail;
  } catch (fallbackErr) {
    console.log("Fallback profiles fetch failed:", fallbackErr);
    throw new Error("An error occurred while fetching users.");
  }
}

export async function createUser({ email, password, username, role = "user" }) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    method: "POST",
    body: { email, password, username, role },
  });
  if (error) {
    // Surface detailed error context from the Edge Function (if provided)
    if (error instanceof FunctionsHttpError) {
      try {
        const ctx = await error.context.json();
        throw new Error(ctx?.message || ctx?.error || JSON.stringify(ctx));
  } catch {
        // If parsing context fails, fall back to the generic message
        throw new Error(error.message || "Failed to create user");
      }
    }
    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      throw new Error(error.message || "Failed to create user");
    }
    throw new Error("Failed to create user");
  }
  return data;
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
  const { data, error } = await supabase.functions.invoke("admin-users", {
    method: "DELETE",
    body: { id },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const ctx = await error.context.json();
        throw new Error(ctx?.message || ctx?.error || JSON.stringify(ctx));
  } catch {
        throw new Error(error.message || "Failed to delete user");
      }
    }
    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      throw new Error(error.message || "Failed to delete user");
    }
    throw new Error("Failed to delete user");
  }
  return data ?? true;
}
