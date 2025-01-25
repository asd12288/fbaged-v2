import BudgetLayout from "../features/budget/BudgetLayout";
import BudgetTableOperations from "../features/budget/BudgetTableOperations";
import Heading from "../ui/Heading";
import Row from "../ui/Row";

function Budget() {
  return (
    <>
      <Row>
        <Heading>Budget</Heading>
        <BudgetTableOperations />
      </Row>
      <BudgetLayout />

      <Row></Row>
    </>
  );
}

export default Budget;
