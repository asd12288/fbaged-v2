import styled from "styled-components";
import { useOptionalAdminScope } from "./AdminScopeContext";
import { useUser } from "../auth/useUser";

const Indicator = styled.div`
  font-size: 1.2rem;
  color: var(--color-grey-600);
  background-color: var(--color-grey-100);
  padding: 0.4rem 1rem;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--color-grey-200);
`;

const UserName = styled.span`
  font-weight: 600;
  color: var(--color-brand-600);
`;

function AdminHeaderIndicator() {
  const { user } = useUser();
  const scope = useOptionalAdminScope();

  // Only show for admins when provider is present
  if (user?.role !== "admin" || !scope) return null;

  const { selectedUser } = scope;

  return (
    <Indicator>
      Viewing as:{" "}
      {selectedUser ? (
        <UserName>
          {selectedUser.username || selectedUser.email || selectedUser.id}
        </UserName>
      ) : (
        <UserName>All Users</UserName>
      )}
    </Indicator>
  );
}

export default AdminHeaderIndicator;
