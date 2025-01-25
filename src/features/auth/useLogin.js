import { QueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { login as loginApi } from "../../services/authApi";

export function useLogin() {
  const navigate = useNavigate();

  const { mutate: login, isPending } = useMutation({
    mutationFn: ({ email, password }) => loginApi({ email, password }),
    onSuccess: (user) => {
      navigate("/dashboard");
      QueryClient.setQueryData(["user"], user.user);
      console.log("Logged in");
    },

    onError: (error) => {
      console.log(error);
    },
  });
  return { login, isPending };
}
