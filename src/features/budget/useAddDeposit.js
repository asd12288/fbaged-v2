import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDeposit } from "../../services/depositsApi";

export function useCreateDeposit() {
  const queryClient = useQueryClient();
  const { mutate: addDeposit, isPending: isEditing } = useMutation({
    mutationFn: async ({ newDeposit }) => {
      await createDeposit(newDeposit);
      console.log("newDeposit", newDeposit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["deposits"]);
    },
    onError: (error) => {
      console.error(error);
    },
  });
  return { addDeposit, isEditing };
}
