import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMaintenanceSetting, updateMaintenanceSetting } from "../../services/settingsApi";
import toast from "react-hot-toast";

export function useMaintenance() {
  const queryClient = useQueryClient();

  const { data: setting, isLoading } = useQuery({
    queryKey: ["maintenanceMode"],
    queryFn: getMaintenanceSetting,
  });

  const { mutate: toggleMaintenance, isLoading: isToggling } = useMutation({
    mutationFn: (newValue) => updateMaintenanceSetting(newValue),
    onSuccess: () => {
      queryClient.invalidateQueries(["maintenanceMode"]);
      toast.success("Maintenance mode updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update maintenance mode");
      console.error("Maintenance update error:", error);
    },
  });

  return {
    isLoading,
    isMaintenanceMode: setting?.isMaintenanceMode,
    toggleMaintenance,
    isToggling,
  };
}