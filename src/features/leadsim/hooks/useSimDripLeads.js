import { useQuery } from "@tanstack/react-query";
import { listSimDripLeads } from "../../../services/leadSimApi";

export function useSimDripLeads(dripId, { status = null } = {}) {
  const { data, isPending, error } = useQuery({
    queryKey: ["sim-drip-leads", dripId, status],
    queryFn: () => listSimDripLeads({ dripId, status }),
    enabled: !!dripId,
    refetchInterval: 4000,
  });

  return {
    leads: data?.rows || [],
    total: data?.total ?? 0,
    isPending,
    error,
  };
}
