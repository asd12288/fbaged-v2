import styled from "styled-components";
import GridBox from "../../../ui/GridBox";
import Heading from "../../../ui/Heading";
import { useBudget } from "../useBudget";
import { formatCurrency } from "../../../utils/helpers";
import { useDeposits } from "../useDeposits";

const StyledBalanceCard = styled.div`
  grid-area: 3 / span 2;
`;

const BudgetPositive = styled.p`
  margin: 2.8rem 0;
  font-size: 5rem;
  font-weight: 500;
  color: var(--color-brand-700);
`;

const BudgetNegative = styled.p`
  font-size: 5rem;
  font-weight: 500;
  color: var(--color-red-700);
  margin-bottom: 1.6rem;
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.4rem;
  margin-top: 5rem;
  padding-top: 2.4rem;
  border-top: 1px solid var(--color-grey-100);
`;

const Detail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 2rem;

  & span:first-child {
    font-size: 1.5rem;
    color: var(--color-grey-500);
    font-weight: 500;
  }

  & span:last-child {
    font-size: 1.8rem;
    font-weight: 500;
  }
`;

function BalanceCard() {
  const {
    budget,
    budgetLow,
    positiveBudgetRequired,
    daysLeft,
    maintenceFees,
    totalDailyBudget,
  } = useBudget();


  return (
    <StyledBalanceCard>
      <GridBox>
        <Heading as="h2">Balance Remaining</Heading>

        {budgetLow ? (
          <BudgetNegative>{formatCurrency(budget)}</BudgetNegative>
        ) : (
          <BudgetPositive>{formatCurrency(budget)}</BudgetPositive>
        )}

        <p>
          Amount Required for 3 next days:{" "}
          <span>{formatCurrency(positiveBudgetRequired)}</span>
        </p>

        <DetailsGrid>
          <Detail>
            <span>Maintence fees</span>
            <span>{formatCurrency(maintenceFees)}</span>
          </Detail>

          <Detail>
            <span>Maintenance Fee Percentage</span>
            <span>5%</span>
          </Detail>

          <Detail>
            <span>Daily Average Spend</span>
            <span>{formatCurrency(totalDailyBudget)}</span>
          </Detail>

          <Detail>
            <span>Days Remaining</span>
            <span>{daysLeft} days</span>
          </Detail>
        </DetailsGrid>
      </GridBox>
    </StyledBalanceCard>
  );
}

export default BalanceCard;
