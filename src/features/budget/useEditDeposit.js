import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDeposit } from "../../services/depositsApi";
import toast from "react-hot-toast";

export function useEditDeposit() {
  const queryClient = useQueryClient();
  const { mutate: editDeposit, isPending: isEditing } = useMutation({
    mutationFn: async ({ updatedDeposit, id }) => {
      await updateDeposit(id, updatedDeposit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["deposits"]);
      toast.success("Deposit updated successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error("An error occurred while updating the deposit");
    },
  });
  return { editDeposit, isEditing };
}
