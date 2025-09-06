import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "../../services/usersApi";
import toast from "react-hot-toast";

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  const { mutate: editUser, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, updates }) => updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User updated successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message || "An error occurred while updating the user");
    },
  });

  return { editUser, isUpdating };
}