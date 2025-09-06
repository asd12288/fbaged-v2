import { useQuery } from "@tanstack/react-query";
import { getDeposits } from "../../services/depositsApi";
import { useUser } from "../auth/useUser";

export function useDeposits() {
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
  const userId = user?.id;
  const { isPending, data, error } = useQuery({
    queryKey: ["deposits", isAdmin ? "all" : userId],
    queryFn: () => getDeposits({ userId, isAdmin }),
    enabled: !!user,
  });

  return { isPending, data, error };
}
