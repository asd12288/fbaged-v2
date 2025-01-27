import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../../services/authApi";

export function useUser() {
  const token = localStorage.getItem("authToken"); // Adjust based on your token storage

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
    enabled: !!token, // Only fetch if token exists
  });

  console.log("User data in useUser hook:", user); // Debugging log

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    profile: user ? { role: user.role, username: user.username } : null,
    error,
  };
}
