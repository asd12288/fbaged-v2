import styled from "styled-components";
import Heading from "../../ui/Heading";
import DepositAddAdminForm from "./DepositAddAdminForm";
import DepositEditAdmin from "./DepositEditAdmin";
import GridBox from "../../ui/GridBox";
import { useDeposits } from "../budget/useDeposits";

const StyledLayout = styled.div`
  grid-template-columns: 1fr 1.5fr;
  display: grid;
  align-items: start;
  gap: 2.4rem;
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

function BudgetAdminLayout() {
  const { data: deposits, isPending } = useDeposits();

  // Calculate summary statistics
  let totalDeposits = 0;
  let recentDeposits = 0;

  if (!isPending && deposits) {
    totalDeposits = deposits.reduce(
      (sum, deposit) => sum + Number(deposit.amount),
      0
    );

    // Get deposits from the last 30 days
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    recentDeposits = deposits
      .filter((deposit) => new Date(deposit.dateAdded) >= last30Days)
      .reduce((sum, deposit) => sum + Number(deposit.amount), 0);
  }

  return (
    <>
      <Heading as={"h2"}>Budget Management</Heading>

      <SummaryContainer>
        <SummaryCard color="var(--color-brand-600)">
          <h3>Total Deposits</h3>
          <p>${totalDeposits.toFixed(2)}</p>
        </SummaryCard>

        <SummaryCard color="var(--color-green-700)">
          <h3>Last 30 Days</h3>
          <p>${recentDeposits.toFixed(2)}</p>
        </SummaryCard>

        <SummaryCard>
          <h3>Deposit Count</h3>
          <p>{isPending ? "..." : deposits.length}</p>
        </SummaryCard>
      </SummaryContainer>

      <GridBox>
        <StyledLayout>
          <DepositAddAdminForm />
          <DepositEditAdmin />
        </StyledLayout>
      </GridBox>
    </>
  );
}

export default BudgetAdminLayout;
