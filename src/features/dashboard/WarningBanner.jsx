import styled from "styled-components";
import { useBudget } from "../budget/useBudget";
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
  const { budgetLow, isPending } = useBudget();

  if (budgetLow) {
    return (
      <Banner>
        {isPending ? (
          <SpinnerMini />
        ) : (
          <p>
            Analyzing your funding history, our system detected that you will
            run out of funds in the next couple of days. Fund your account so
            your campaigns will stay active!
          </p>
        )}
      </Banner>
    );
  }

  return null;
}

export default WarningBanner;
