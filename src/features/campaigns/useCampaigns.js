import { useQuery } from "@tanstack/react-query";
import { getCampaigns } from "../../services/campaignApi";
import { useUser } from "../auth/useUser";
import { useOptionalAdminScope } from "../admin/AdminScopeContext";

export function useCampaigns(params = {}) {
  const { user } = useUser();
  const scope = useOptionalAdminScope();
  const isAdmin = user?.role === "admin";
  const selectedUserId = params.filterUserId ?? scope?.selectedUserId ?? null;
  const effectiveUserId = isAdmin ? selectedUserId || null : user?.id;

  const { isPending, data, error } = useQuery({
    queryKey: ["campaigns", effectiveUserId || (isAdmin ? "none" : null)],
    queryFn: () =>
      getCampaigns({
        userId: isAdmin ? null : user?.id,
        filterUserId: effectiveUserId || undefined,
      }),
    enabled: !!user && (!isAdmin || !!effectiveUserId),
  });
  return { isPending, data, error };
}
