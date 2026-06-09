import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSimDrip } from "../../../services/leadSimApi";

export function useSimDripCreate(clientId) {
  const queryClient = useQueryClient();

  const { mutateAsync: createDrip, isPending: isCreating, error } =
    useMutation({
      mutationFn: createSimDrip,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["sim-drips", clientId] });
      },
    });

  return { createDrip, isCreating, error };
}
