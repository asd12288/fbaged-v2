import { useQuery } from "@tanstack/react-query";
import { getLeadBatches } from "../../../services/leadsApi";

export function useLeadBatches({ assignedUserId, enabled = true } = {}) {
  const {
    data,
    isPending,
    error,
  } = useQuery({
    queryKey: ["lead-batches", assignedUserId || "me"],
    queryFn: () => getLeadBatches({ assignedUserId }),
    enabled,
  });

  return { data, isPending, error };
}
