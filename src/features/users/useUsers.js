import { useQuery } from "@tanstack/react-query";
import { getAllUsers } from "../../services/usersApi";

export function useUsers() {
  const {
    data: users,
    isLoading: isPending,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
  });

  return { data: users, isPending, error };
}