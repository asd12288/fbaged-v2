import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDeposit } from "../../services/depositsApi";
import toast from "react-hot-toast";

export function useDeleteDeposit() {
  const queryClient = useQueryClient();
  const { mutate: removeDeposit, isLoading: isDeleting } = useMutation({
    mutationFn: async (id) => {
      await deleteDeposit(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["deposits"]);
      toast.success("Deposit deleted successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error("An error occurred while deleting the deposit");
    },
  });

  return { removeDeposit, isDeleting };
}
