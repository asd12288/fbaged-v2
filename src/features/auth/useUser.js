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
    staleTime: 300000, // Consider data fresh for 5 minutes
    cacheTime: 600000, // Keep data in cache for 10 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    enabled: true, // Only fetch if we have a token (you might want to check this)
  });

  console.log("User data in useUser hook:", user); // Debugging log

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    profile: { role: user?.role, username: user?.username },
    error,
  };
}
