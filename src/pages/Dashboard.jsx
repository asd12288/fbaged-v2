import DashboardLayout from "../features/dashboard/DashboardLayout";
import Heading from "../ui/Heading";
import Row from "../ui/Row";
import { useUser } from "../features/auth/useUser";
import { useOptionalAdminScope } from "../features/admin/AdminScopeContext";
import styled from "styled-components";

const Notice = styled.div`
  background-color: var(--color-yellow-100);
  border: 1px solid var(--color-yellow-300);
  color: var(--color-yellow-900);
  padding: 1.2rem 1.6rem;
  border-radius: var(--border-radius-sm);
`;

function Dashboard() {
  const { user } = useUser();
  const scope = useOptionalAdminScope();
  const needsSelection = user?.role === "admin" && !scope?.selectedUserId;
  return (
    <>
      <Row>
        <Heading>Dashboard</Heading>
        <p>The data resfrash every 8 hours</p>
      </Row>
      {needsSelection && (
        <Notice>Select a user from the sidebar to view data.</Notice>
      )}
      <DashboardLayout />
    </>
  );
}

export default Dashboard;
