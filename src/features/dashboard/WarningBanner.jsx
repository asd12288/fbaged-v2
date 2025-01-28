import styled from "styled-components";
import { formatCurrency } from "../../utils/helpers";
import { useBudget } from "../budget/useBudget";
import Spinner from "../../ui/Spinner";
import SpinnerMini from "../../ui/SpinnerMini";

const Banner = styled.div`
  background-color: var(--color-red-100);
  color: var(--color-red-700);
  display: flex;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  border-radius: var(--border-radius-md);
`;

function WarningBanner() {
  const { budget, budgetLow, isPending } = useBudget();

  if (budgetLow) {
    return (
      <Banner>
        {isPending ? (
          <SpinnerMini />
        ) : (
          <p>
            Analyzing your funding history, our system detected that you will
            run out of funds in the next couple of days. Remaining Budget:{" "}
            <br />
            <span>{formatCurrency(budget)}</span>. Fund your account so your
            campaigns will stay active!
          </p>
        )}
      </Banner>
    );
  }

  return null;
}

export default WarningBanner;
