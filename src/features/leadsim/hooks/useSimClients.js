import { useQuery } from "@tanstack/react-query";
import { listSimClients } from "../../../services/leadSimApi";

export function useSimClients() {
  const { data, isPending, error } = useQuery({
    queryKey: ["sim-clients"],
    queryFn: listSimClients,
  });
  return { clients: data || [], isPending, error };
}
