import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../../services/accountsApi";
import { useUser } from "../auth/useUser";

export function useAccounts(params = {}) {
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
  const userId = user?.id;
  const { isPending, data, error } = useQuery({
    queryKey: ["accounts", params.filterUserId ?? (isAdmin ? "all" : userId)],
    queryFn: () =>
      getAccounts({ userId, isAdmin, filterUserId: params.filterUserId }),
    enabled: !!user,
  });

  return { isPending, data, error };
}
