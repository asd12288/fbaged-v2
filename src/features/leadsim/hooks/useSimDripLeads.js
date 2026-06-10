import { useQuery } from "@tanstack/react-query";
import { listSimDripLeads } from "../../../services/leadSimApi";

export function useSimDripLeads(dripId, { status = null, offset = 0 } = {}) {
  const { data, isPending, error } = useQuery({
    queryKey: ["sim-drip-leads", dripId, status, offset],
    queryFn: () => listSimDripLeads({ dripId, status, offset }),
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
