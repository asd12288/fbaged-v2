import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEditCampaign } from "../../services/campaignApi";
import toast from "react-hot-toast";

export function useEditCampaign() {
  const queryClient = useQueryClient();
  const { mutate: editCampaign, isLoading: isEditing } = useMutation({
    mutationFn: async ({ newCampaign, id }) => {
      await createEditCampaign(newCampaign, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["campaigns"]);
      toast.success("Campaign updated successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error("An error occurred while updating the campaign");
    },
  });
  return { editCampaign, isEditing };
}
