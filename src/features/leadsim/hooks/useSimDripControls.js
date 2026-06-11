import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  retrySimDripLead,
  runSimDelivery,
  setSimDripStatus,
  updateSimDripPace,
} from "../../../services/leadSimApi";

export function useSimDripControls(dripId) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sim-drip", dripId] });
    queryClient.invalidateQueries({ queryKey: ["sim-drip-leads", dripId] });
    queryClient.invalidateQueries({ queryKey: ["sim-drips"] });
  };

  const status = useMutation({ mutationFn: setSimDripStatus, onSuccess: invalidate });
  const pace = useMutation({ mutationFn: updateSimDripPace, onSuccess: invalidate });
  const retry = useMutation({ mutationFn: retrySimDripLead, onSuccess: invalidate });
  const delivery = useMutation({ mutationFn: () => runSimDelivery(), onSuccess: invalidate });

  return {
    start: () => status.mutateAsync({ dripId, action: "start" }),
    pause: () => status.mutateAsync({ dripId, action: "pause" }),
    resume: () => status.mutateAsync({ dripId, action: "resume" }),
    cancel: () => status.mutateAsync({ dripId, action: "cancel" }),
    setPace: (dailyVolume) => pace.mutateAsync({ dripId, dailyVolume }),
    retryLead: (leadId) => retry.mutateAsync({ leadId }),
    runDelivery: () => delivery.mutateAsync(),
    isChangingStatus: status.isPending,
    isSettingPace: pace.isPending,
    isRetrying: retry.isPending,
    isRunningDelivery: delivery.isPending,
  };
}
