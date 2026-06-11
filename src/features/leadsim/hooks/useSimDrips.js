import { useQuery } from "@tanstack/react-query";
import { listSimDrips } from "../../../services/leadSimApi";

export function useSimDrips(clientId) {
  const { data, isPending, error } = useQuery({
    queryKey: ["sim-drips", clientId],
    queryFn: () => listSimDrips({ clientId }),
    enabled: !!clientId,
    refetchInterval: 5000,
  });

  return { drips: data || [], isPending, error };
}
