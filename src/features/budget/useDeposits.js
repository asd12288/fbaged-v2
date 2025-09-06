import { useQuery } from "@tanstack/react-query";
import { getDeposits } from "../../services/depositsApi";
import { useUser } from "../auth/useUser";

export function useDeposits(params = {}) {
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
  const userId = user?.id;
  const { isPending, data, error } = useQuery({
    queryKey: ["deposits", params.filterUserId ?? (isAdmin ? "all" : userId)],
    queryFn: () =>
      getDeposits({ userId, isAdmin, filterUserId: params.filterUserId }),
    enabled: !!user,
  });

  return { isPending, data, error };
}
