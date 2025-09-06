import styled from "styled-components";
import { useUsers } from "../users/useUsers";
import { useAdminScope } from "./AdminScopeContext";
import { useUser } from "../auth/useUser";

const Wrapper = styled.div`
  background-color: var(--color-grey-0);
  border: 1px solid var(--color-grey-100);
  border-radius: var(--border-radius-sm);
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const Label = styled.div`
  font-size: 1.2rem;
  color: var(--color-grey-600);
  font-weight: 600;
`;

const Select = styled.select`
  font-size: 1.4rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
`;

function AdminUserSwitcher() {
  const { user } = useUser();
  const { data: users } = useUsers();
  const { selectedUserId, setSelectedUserId } = useAdminScope();

  if (user?.role !== "admin") return null;

  return (
    <Wrapper>
      <Label>View data as</Label>
      <Select
        value={selectedUserId || ""}
        onChange={(e) => setSelectedUserId(e.target.value || null)}
      >
        <option value="">Select user…</option>
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
