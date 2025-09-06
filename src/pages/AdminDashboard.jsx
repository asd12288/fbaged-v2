import { useState } from "react";
import styled from "styled-components";
import Heading from "../ui/Heading";
import CampaignsAdminLayout from "../features/admin/CampaignsAdminLayout";
import BudgetAdminLayout from "../features/admin/BudgetAdminLayout";
import AccountAdminLayout from "../features/admin/AccountAdminLayout";
import UsersAdminLayout from "../features/users/UsersAdminLayout";
import { useUser } from "../features/auth/useUser";
import AdminControls from "../features/admin/AdminControls";
import {
  AdminScopeProvider,
  useAdminScope,
} from "../features/admin/AdminScopeContext";
import { useUsers } from "../features/users/useUsers";

const AdminContainer = styled.div`
  background-color: var(--color-grey-50);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
  padding: 2.4rem;
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 3.2rem;
  border-bottom: 1px solid var(--color-grey-200);
`;

const Tab = styled.button`
  background: none;
  border: none;
  padding: 1.2rem 2.4rem;
  font-size: 1.6rem;
  font-weight: 600;
  color: ${(props) =>
    props.$active ? "var(--color-brand-600)" : "var(--color-grey-500)"};
  border-bottom: 2px solid
    ${(props) => (props.$active ? "var(--color-brand-600)" : "transparent")};
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    color: var(--color-brand-600);
  }
`;

const StatusBar = styled.div`
  background-color: var(--color-grey-100);
  padding: 1.2rem 2.4rem;
  border-radius: var(--border-radius-sm);
  margin-bottom: 2.4rem;
`;

const ScopeBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-grey-100);
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-sm);
  padding: 1.2rem 1.6rem;
  margin-bottom: 1.6rem;
`;

const UserSelect = styled.select`
  font-size: 1.4rem;
  padding: 0.6rem 1rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
`;

function AdminDashboardInner() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const { user } = useUser();
  const { data: users } = useUsers();
  const { selectedUserId, setSelectedUserId, selectedUser } = useAdminScope();

  if (user.role !== "admin") {
    return <Heading>Access denied</Heading>;
  }

  return (
    <>
      <Heading>Admin Dashboard</Heading>

      <StatusBar>
        <AdminControls />
      </StatusBar>

      <ScopeBanner>
        <div>
          Viewing data for:{" "}
          {selectedUser ? (
            <strong>{selectedUser.username}</strong>
          ) : (
            <em>no user selected</em>
          )}
        </div>
        <div>
          <UserSelect
            value={selectedUserId || ""}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
          >
            <option value="">Select user…</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username || u.email || u.id}
              </option>
            ))}
          </UserSelect>
        </div>
      </ScopeBanner>

      <AdminContainer>
        <TabContainer>
          <Tab
            $active={activeTab === "campaigns"}
            onClick={() => setActiveTab("campaigns")}
          >
            Campaigns
          </Tab>
          <Tab
            $active={activeTab === "budget"}
            onClick={() => setActiveTab("budget")}
          >
            Budget
          </Tab>
          <Tab
            $active={activeTab === "accounts"}
            onClick={() => setActiveTab("accounts")}
          >
            Accounts
          </Tab>
          <Tab
            $active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
          >
            Users
          </Tab>
        </TabContainer>

        {activeTab === "campaigns" && selectedUserId && (
          <CampaignsAdminLayout />
        )}
        {activeTab === "budget" && selectedUserId && <BudgetAdminLayout />}
        {activeTab === "accounts" && selectedUserId && <AccountAdminLayout />}
        {activeTab === "users" && <UsersAdminLayout />}
      </AdminContainer>
    </>
  );
}

function AdminDashboard() {
  return (
    <AdminScopeProvider>
      <AdminDashboardInner />
    </AdminScopeProvider>
  );
}

export default AdminDashboard;
