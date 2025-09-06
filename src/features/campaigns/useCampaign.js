import { useQuery } from "@tanstack/react-query";
import { getCampaign } from "../../services/campaignApi";
import { useUser } from "../auth/useUser";

export function useCampaign(id) {
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
  const userId = user?.id;
  const { isPending, data, error } = useQuery({
    queryKey: ["campaign", id, isAdmin ? "all" : userId],
    queryFn: () => getCampaign(id, { userId, isAdmin }),
    enabled: !!user && !!id,
  });

  return { isPending, data: data?.[0], error };
}
