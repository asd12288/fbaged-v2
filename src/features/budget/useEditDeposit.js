import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDeposit } from "../../services/depositsApi";

export function useEditDeposit() {
  const queryClient = useQueryClient();
  const { mutate: editDeposit, isPending: isEditing } = useMutation({
    mutationFn: async ({ updatedDeposit, id }) => {
      await updateDeposit(id, updatedDeposit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["deposits"]);
    },
    onError: (error) => {
      console.error(error);
    },
  });
  return { editDeposit, isEditing };
}