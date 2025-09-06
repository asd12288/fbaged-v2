import BudgetLayout from "../features/budget/BudgetLayout";
import BudgetTableOperations from "../features/budget/BudgetTableOperations";
import WarningBanner from "../features/dashboard/WarningBanner";
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

function Budget() {
  const { user } = useUser();
  const scope = useOptionalAdminScope();
  const needsSelection = user?.role === "admin" && !scope?.selectedUserId;
  return (
    <>
      <Row>
        <Heading>Budget</Heading>
        <BudgetTableOperations />
      </Row>
      {needsSelection && (
        <Notice>Select a user from the sidebar to view data.</Notice>
      )}
      <WarningBanner />
      <BudgetLayout />

      <Row></Row>
    </>
  );
}

export default Budget;
