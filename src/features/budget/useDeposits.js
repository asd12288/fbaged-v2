import { useQuery } from "@tanstack/react-query";
import { getDeposits } from "../../services/depositsApi";

export function useDeposits() {
  const { isPending, data, error } = useQuery({
    queryKey: ["deposits"],
    queryFn: getDeposits,
  });

  return { isPending, data, error };
}
