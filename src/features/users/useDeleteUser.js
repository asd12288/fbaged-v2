import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser } from "../../services/usersApi";
import toast from "react-hot-toast";

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  const { mutate: removeUser, isPending: isDeleting } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User deleted successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message || "An error occurred while deleting the user");
    },
  });

  return { removeUser, isDeleting };
}