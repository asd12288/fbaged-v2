import { useQuery } from "@tanstack/react-query";
import { getCampaign } from "../../services/campaignApi";
import { useUser } from "../auth/useUser";

export function useCampaign(id, params = {}) {
  const { user } = useUser();
  const userId = user?.id;
  const { isPending, data, error } = useQuery({
    queryKey: ["campaign", id, params.filterUserId ?? userId],
    queryFn: () =>
      getCampaign(id, { userId, filterUserId: params.filterUserId }),
    enabled: params.enabled ?? (!!user && !!id),
  });

  return { isPending, data: data?.[0], error };
}
