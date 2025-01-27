import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAccount } from "../../services/accountsApi";

export default function useEditAccount() {
  const queryClient = useQueryClient();
  const { mutate: editAccount, isPending: isEditing } = useMutation({
    mutationFn: async ({ updatedAccount, id }) => {
      await updateAccount(id, updatedAccount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["accounts"]);
    },
    onError: (error) => {
      console.error(error);
    },
  });
  return { editAccount, isEditing };
}
