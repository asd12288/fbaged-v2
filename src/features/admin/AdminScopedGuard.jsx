/* eslint-disable react/prop-types */
import styled from "styled-components";
import { useUser } from "../auth/useUser";
import { useOptionalAdminScope } from "./AdminScopeContext";

const Notice = styled.div`
  background-color: var(--color-yellow-100);
  border: 1px solid var(--color-yellow-300);
  color: var(--color-yellow-900);
  padding: 1.2rem 1.6rem;
  border-radius: var(--border-radius-sm);
`;

function AdminScopedGuard({ children }) {
  const { user } = useUser();
  const scope = useOptionalAdminScope();
  const needsSelection = user?.role === "admin" && !scope?.selectedUserId;
  if (needsSelection)
    return <Notice>Select a user from the sidebar to view data.</Notice>;
  return children;
}

export default AdminScopedGuard;
