import styled from "styled-components";
import DepositList from "./deposit/DepositList";
import ExpensesOverview from "./expenses/ExpensesOverview";
import Row from "../../ui/Row";
import DepositChart from "./deposit/DepositChart";
import Heading from "../../ui/Heading";
import { useDeposits } from "./useDeposits";
import { useSearchParams } from "react-router";

const StyledBudgetLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 500px;
  gap: 1.2rem;
`;

function BudgetLayout() {
  
  return (
    <>
      <StyledBudgetLayout>
        <DepositChart />
        <DepositList />
      </StyledBudgetLayout>
      <Row>
        <Heading>Expenses overview</Heading>
        <Heading as="h2">as for {new Date().toLocaleDateString()}</Heading>
      </Row>
      <ExpensesOverview />
    </>
  );
}

export default BudgetLayout;
