import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmLeadImport } from "../../../services/leadsApi";

export function useLeadImportConfirm() {
  const queryClient = useQueryClient();

  const { mutateAsync: confirmImport, isPending: isConfirming, error } =
    useMutation({
      mutationFn: confirmLeadImport,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["lead-batches"] });
      },
    });

  return { confirmImport, isConfirming, error };
}
