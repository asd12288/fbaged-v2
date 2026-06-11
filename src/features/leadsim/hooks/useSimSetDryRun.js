import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setSimDryRun } from "../../../services/leadSimApi";

export function useSimSetDryRun() {
  const queryClient = useQueryClient();

  const { mutateAsync: setDryRun, isPending: isSettingDryRun, error } =
    useMutation({
      mutationFn: setSimDryRun,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["sim-settings"] });
      },
    });

  return { setDryRun, isSettingDryRun, error };
}
