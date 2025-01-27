import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAccount } from "../../services/accountsApi";
import toast from "react-hot-toast";

export default function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { mutate: removeAccount } = useMutation({
    mutationFn: async (id) => {
      await deleteAccount(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["accounts"]);
      toast.success("Account deleted");
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return { removeAccount };
}
