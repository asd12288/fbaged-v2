import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { logout as logoutApi } from "../../services/authApi";

export function useLogout() {
  const QueryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate: logout, isPending } = useMutation({
    mutationFn: () => logoutApi(),
    onSuccess: () => {
      QueryClient.setQueryData(["user"], null);
      navigate("/login");
    },
    onError: (error) => {
      console.log(error);
    },
  });
  return { logout, isPending };
}
