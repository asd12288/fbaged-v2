import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDeposit } from "../../services/depositsApi";
import toast from "react-hot-toast";

export function useCreateDeposit() {
  const queryClient = useQueryClient();
  const { mutate: addDeposit, isPending: isEditing } = useMutation({
    mutationFn: async ({ newDeposit }) => {
      await createDeposit(newDeposit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["deposits"]);
      toast.success("Deposit added!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Error adding deposit");
    },
  });
  return { addDeposit, isEditing };
}
