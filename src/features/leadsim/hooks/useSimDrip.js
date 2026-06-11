import { useQuery } from "@tanstack/react-query";
import { getSimDrip } from "../../../services/leadSimApi";

export function useSimDrip(dripId) {
  const { data, isPending, error } = useQuery({
    queryKey: ["sim-drip", dripId],
    queryFn: () => getSimDrip({ dripId }),
    enabled: !!dripId,
    refetchInterval: (query) =>
      query.state.data?.drip?.status === "running" ? 4000 : false,
  });

  return {
    drip: data?.drip ?? null,
    client: data?.client ?? null,
    counts: data?.counts ?? null,
    isPending,
    error,
  };
}
