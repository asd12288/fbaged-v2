import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../../services/authApi";

export function useUser() {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user"],
    queryFn: getCurrentUser,
    retry: false, // Optional: Prevent retrying on failure
  });

  console.log("User data in useUser hook:", user);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    profile: { role: user?.role, username: user?.username },
    error,
  };
}
