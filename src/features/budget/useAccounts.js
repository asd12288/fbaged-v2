import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../../services/accountsApi";

export function useAccounts() {
  const { isPending, data, error } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  return { isPending, data, error };
}
