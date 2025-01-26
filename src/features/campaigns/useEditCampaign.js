import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEditCampaign } from "../../services/campaignApi";

export function useEditCampaign() {
  const queryClient = useQueryClient();
  const { mutate: editCampaign, isLoading: isEditing } = useMutation({
    mutationFn: async ({ newCampaign, id }) => {
      await createEditCampaign(newCampaign, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["campaigns"]);
    },
    onError: (error) => {
      console.error(error);
    },
  });
  return { editCampaign, isEditing };
}
