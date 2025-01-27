import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useUser } from "./useUser";
import FullPageSpinner from "../../ui/FullPageSpinner";

function ProtectedRoute({ children }) {
  const { user, isLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[ProtectedRoute] user:", user);
    if (!isLoading && !user) {
      console.log("[ProtectedRoute] No user found, redirecting to login");
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  return children;
}

export default ProtectedRoute;
