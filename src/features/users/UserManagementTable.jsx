import { useState } from "react";
import Table from "../../ui/Table";
import { useUsers } from "./useUsers";
import { useUser } from "../auth/useUser";
import UserRow from "./UserRow";
import styled from "styled-components";
import Spinner from "../../ui/Spinner";
import { HiSearch } from "react-icons/hi";

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1.6rem;
  margin-bottom: 2.4rem;
`;

const SearchInput = styled.input`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  padding-left: 3.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  box-shadow: var(--shadow-sm);
  width: 30rem;
`;

const SearchWrapper = styled.div`
  position: relative;

  svg {
    position: absolute;
    top: 50%;
    left: 1rem;
    transform: translateY(-50%);
    color: var(--color-grey-500);
    width: 1.8rem;
    height: 1.8rem;
  }
`;

const SummaryContainer = styled.div`
  display: flex;
  gap: 1.6rem;
  margin-bottom: 2.4rem;
`;

const SummaryCard = styled.div`
  background-color: var(--color-grey-0);
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  padding: 1.6rem;
  flex: 1;
  box-shadow: var(--shadow-sm);

  h3 {
    font-size: 1.4rem;
    color: var(--color-grey-500);
    margin-bottom: 0.8rem;
  }

  p {
    font-size: 2rem;
    font-weight: 600;
    color: ${(props) => props.color || "var(--color-grey-700)"};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3.2rem;
  color: var(--color-grey-500);

  h4 {
    font-size: 1.8rem;
    margin-bottom: 0.8rem;
  }

  p {
    font-size: 1.4rem;
  }
`;

function UserManagementTable() {
  const { data: users, isPending } = useUsers();
  const { user: currentUser } = useUser();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter users based on search query
  const filteredUsers = (users || [])
    // Exclude current user just in case backend didn't
    .filter((u) => (currentUser?.id ? u.id !== currentUser.id : true))
    // Apply search
    .filter((user) => {
      if (searchQuery.trim() === "") return true;
      const q = searchQuery.toLowerCase();
      return (
        (user.username || "").toLowerCase().includes(q) ||
        (user.email || "").toLowerCase().includes(q)
      );
    });

  // Calculate summary statistics
  let totalUsers = 0;
  let adminCount = 0;
  let userCount = 0;

  if (!isPending && filteredUsers) {
    totalUsers = filteredUsers.length;
    adminCount = filteredUsers.filter((user) => user.role === "admin").length;
    userCount = filteredUsers.filter((user) => user.role === "user").length;
  }

  if (isPending) return <Spinner />;

  return (
    <div>
      <SummaryContainer>
        <SummaryCard color="var(--color-brand-600)">
          <h3>Total Users</h3>
          <p>{totalUsers}</p>
        </SummaryCard>

        <SummaryCard color="var(--color-red-700)">
          <h3>Admins</h3>
          <p>{adminCount}</p>
        </SummaryCard>

        <SummaryCard color="var(--color-green-700)">
          <h3>Regular Users</h3>
          <p>{userCount}</p>
        </SummaryCard>
      </SummaryContainer>

      <SearchContainer>
        <SearchWrapper>
          <HiSearch />
          <SearchInput
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchWrapper>
      </SearchContainer>

      {filteredUsers?.length === 0 ? (
        <EmptyState>
          <h4>No users found</h4>
          <p>
            {searchQuery
              ? "Try adjusting your search query"
              : "Create some users to get started"}
          </p>
        </EmptyState>
      ) : (
        <Table columns="2fr 1fr 1.5fr 1fr" type="compact">
          <Table.Header>
            <th>User</th>
            <th>Role</th>
            <th>Created</th>
            <th>Actions</th>
          </Table.Header>
          <Table.Body
            data={filteredUsers}
            render={(user) => <UserRow key={user.id} user={user} />}
          />
        </Table>
      )}
    </div>
  );
}

export default UserManagementTable;
