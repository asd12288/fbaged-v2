import styled from "styled-components";
import { useUsers } from "../users/useUsers";
import { useOptionalAdminScope } from "./AdminScopeContext";
import { useUser } from "../auth/useUser";

const Wrapper = styled.div`
  padding: 1.6rem 0;
  border-bottom: 1px solid var(--color-grey-200);
  margin-bottom: 1.6rem;
`;

const Label = styled.div`
  font-size: 1.1rem;
  color: var(--color-grey-500);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.8rem;
`;

const Select = styled.select`
  width: 100%;
  font-size: 1.3rem;
  padding: 0.8rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-50);
  color: var(--color-grey-700);

  &:focus {
    outline: none;
    border-color: var(--color-brand-500);
    background-color: var(--color-grey-0);
  }
`;

function AdminUserSwitcher() {
  const { user } = useUser();
  const { data: users } = useUsers();
  const scope = useOptionalAdminScope();

  // Only show for admins and when the provider is present
  if (user?.role !== "admin" || !scope) return null;
  const { selectedUserId, setSelectedUserId } = scope;

  return (
    <Wrapper>
      <Label>View as User</Label>
      <Select
        value={selectedUserId || ""}
        onChange={(e) => setSelectedUserId(e.target.value || null)}
      >
        <option value="">All Users</option>
        {users?.map((u) => (
          <option key={u.id} value={u.id}>
            {u.username || u.email || u.id}
          </option>
        ))}
      </Select>
    </Wrapper>
  );
}

export default AdminUserSwitcher;
