import { useQuery } from "@tanstack/react-query";
import { getCampaigns } from "../../services/campaignApi";
import { useUser } from "../auth/useUser";

export function useCampaigns() {
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
  const userId = user?.id;

  const { isPending, data, error } = useQuery({
    queryKey: ["campaigns", isAdmin ? "all" : userId],
    queryFn: () => getCampaigns({ userId, isAdmin }),
    enabled: !!user,
  });
  return { isPending, data, error };
}
