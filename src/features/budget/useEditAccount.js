import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAccount } from "../../services/accountsApi";
import toast from "react-hot-toast";

export default function useEditAccount() {
  const queryClient = useQueryClient();
  const { mutate: editAccount, isPending: isEditing } = useMutation({
    mutationFn: async ({ updatedAccount, id }) => {
      await updateAccount(id, updatedAccount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["accounts"]);
      toast.success("Account updated successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error("An error occurred while updating the account");
    },
  });
  return { editAccount, isEditing };
}
