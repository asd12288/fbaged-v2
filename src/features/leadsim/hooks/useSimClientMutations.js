import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertSimClient, archiveSimClient } from "../../../services/leadSimApi";

export function useSimClientMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["sim-clients"] });

  const upsert = useMutation({ mutationFn: upsertSimClient, onSuccess: invalidate });
  const archive = useMutation({ mutationFn: archiveSimClient, onSuccess: invalidate });

  return {
    saveClient: upsert.mutateAsync,
    isSaving: upsert.isPending,
    saveError: upsert.error,
    archiveClient: archive.mutateAsync,
    isArchiving: archive.isPending,
  };
}
