import { useQuery } from "@tanstack/react-query";
import { getCampaigns } from "../../services/campaignApi";

export function useCampaigns() {
  const { isPending, data, error } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
  });
  return { isPending, data, error };
}
