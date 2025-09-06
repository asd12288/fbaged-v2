import { useQuery } from "@tanstack/react-query";
import { getCampaigns } from "../../services/campaignApi";
import { useUser } from "../auth/useUser";

export function useCampaigns(params = {}) {
  const { user } = useUser();
  const userId = user?.id;

  const { isPending, data, error } = useQuery({
    queryKey: ["campaigns", params.filterUserId ?? userId],
    queryFn: () => getCampaigns({ userId, filterUserId: params.filterUserId }),
    enabled: !!user,
  });
  return { isPending, data, error };
}
