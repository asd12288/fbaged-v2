import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAccount } from "../../services/accountsApi";
import toast from "react-hot-toast";

export default function useAddAccount() {
  const queryClient = useQueryClient();
  const { mutate: addAccount, isPending: isAdding } = useMutation({
    mutationFn: async ({ newAccount }) => {
      await createAccount(newAccount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["accounts"]);
      toast.success("Account added");
    },
    onError: (error) => {
      console.error(error);
      toast.error("An error occurred while adding the account");
    },
  });
  return { addAccount, isAdding };
}
