import BudgetLayout from "../features/budget/BudgetLayout";
import BudgetTableOperations from "../features/budget/BudgetTableOperations";
import WarningBanner from "../features/dashboard/WarningBanner";
import Heading from "../ui/Heading";
import Row from "../ui/Row";

function Budget() {
  return (
    <>
      <Row>
        <Heading>Budget</Heading>
        <BudgetTableOperations />
      </Row>
      <WarningBanner />
      <BudgetLayout />

      <Row></Row>
    </>
  );
}

export default Budget;
