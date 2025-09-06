import { useQuery } from "@tanstack/react-query";
import { getCampaign } from "../../services/campaignApi";
import { useUser } from "../auth/useUser";
import { useOptionalAdminScope } from "../admin/AdminScopeContext";

export function useCampaign(id, params = {}) {
  const { user } = useUser();
  const scope = useOptionalAdminScope();
  const isAdmin = user?.role === "admin";
  const selectedUserId = params.filterUserId ?? scope?.selectedUserId ?? null;
  const effectiveUserId = isAdmin ? selectedUserId || null : user?.id;
  const { isPending, data, error } = useQuery({
    queryKey: ["campaign", id, effectiveUserId || (isAdmin ? "none" : null)],
    queryFn: () =>
      getCampaign(id, {
        userId: isAdmin ? null : user?.id,
        filterUserId: effectiveUserId || undefined,
      }),
    enabled:
      params.enabled ?? (!!user && !!id && (!isAdmin || !!effectiveUserId)),
  });

  return { isPending, data: data?.[0], error };
}
