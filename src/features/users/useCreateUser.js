import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "../../services/usersApi";
import toast from "react-hot-toast";

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  const { mutate: addUser, isPending: isCreating } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User created successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message || "An error occurred while creating the user");
    },
  });

  return { addUser, isCreating };
}