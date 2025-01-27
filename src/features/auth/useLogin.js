import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login as loginApi, getCurrentUser } from "../../services/authApi"; // Ensure getCurrentUser is exported
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: login, isLoading: isPending } = useMutation({
    mutationFn: ({ email, password }) => loginApi({ email, password }),
    onSuccess: async () => {
      try {
        // After successful login, fetch the complete user data
        const user = await getCurrentUser();

        // Store the complete user data in react-query's cache
        await queryClient.setQueryData(["user"], user);
        toast.success("Logged in successfully");
        navigate("/dashboard");
      } catch (error) {
        toast.error("Failed to fetch user data");
        console.error("Error fetching user data:", error);
      }
    },
    onError: (error) => {
      toast.error(error.message);
      console.error("Login error:", error);
    },
  });

  return { login, isPending };
}
