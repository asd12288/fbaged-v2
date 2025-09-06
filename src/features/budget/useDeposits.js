import { useQuery } from "@tanstack/react-query";
import { getDeposits } from "../../services/depositsApi";
import { useUser } from "../auth/useUser";
import { useOptionalAdminScope } from "../admin/AdminScopeContext";

export function useDeposits(params = {}) {
  const { user } = useUser();
  const scope = useOptionalAdminScope();
  const isAdmin = user?.role === "admin";
  const selectedUserId = params.filterUserId ?? scope?.selectedUserId ?? null;
  const userId = user?.id;
  const { isPending, data, error } = useQuery({
    queryKey: [
      "deposits",
      (isAdmin ? selectedUserId || "none" : userId) ?? null,
    ],
    queryFn: () =>
      getDeposits({
        userId,
        isAdmin,
        filterUserId: isAdmin ? selectedUserId || undefined : undefined,
      }),
    enabled: !!user && (!isAdmin || !!selectedUserId),
  });

  return { isPending, data, error };
}
