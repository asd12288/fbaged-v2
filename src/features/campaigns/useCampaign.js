import { useQuery } from "@tanstack/react-query";
import { getCampaign } from "../../services/campaignApi";

export function useCampaign(id) {
  const { isPending, data, error } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => getCampaign(id),
  });

  return { isPending, data: data?.[0], error };
}
