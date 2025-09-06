import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../../services/accountsApi";
import { useUser } from "../auth/useUser";
import { useOptionalAdminScope } from "../admin/AdminScopeContext";

export function useAccounts(params = {}) {
  const { user } = useUser();
  const scope = useOptionalAdminScope();
  const isAdmin = user?.role === "admin";
  const selectedUserId = params.filterUserId ?? scope?.selectedUserId ?? null;
  const userId = user?.id;
  const { isPending, data, error } = useQuery({
    queryKey: [
      "accounts",
      (isAdmin ? selectedUserId || "none" : userId) ?? null,
    ],
    queryFn: () =>
      getAccounts({
        userId,
        isAdmin,
        filterUserId: isAdmin ? selectedUserId || undefined : undefined,
      }),
    enabled: !!user && (!isAdmin || !!selectedUserId),
  });

  return { isPending, data, error };
}
