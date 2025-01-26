import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDeposit } from "../../services/depositsApi";

export function useDeleteDeposit() {
  const queryClient = useQueryClient();
  const { mutate: removeDeposit, isLoading: isDeleting } = useMutation({
    mutationFn: async (id) => {
      await deleteDeposit(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["deposits"]);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return { removeDeposit, isDeleting };
}
