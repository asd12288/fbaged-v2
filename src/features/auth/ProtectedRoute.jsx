import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useUser } from "./useUser";
import FullPageSpinner from "../../ui/FullPageSpinner";

function ProtectedRoute({ children }) {
  const navigate = useNavigate();

  const { user, isLoading, isAuthenticated } = useUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);



  if (isAuthenticated) {
    return children;
  }
}

export default ProtectedRoute;
