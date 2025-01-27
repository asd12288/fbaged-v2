import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useUser } from "./useUser";
import FullPageSpinner from "../../ui/FullPageSpinner";

function ProtectedRoute({ children }) {
  const { user, isLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  return children;
}

export default ProtectedRoute;
