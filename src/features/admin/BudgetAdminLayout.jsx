import Button from "../../ui/Button";
import ControlButtons from "../../ui/ControlButtons.JSX";
import Heading from "../../ui/Heading";
import DepositList from "../budget/deposit/DepositList";
import DepositAdminForm from "./DepositAdminForm";
import DepositAdminList from "./DepositAdminList";

function BudgetAdminLayout() {
  return (
    <>
      <Heading as="h2">Budget</Heading>
      <DepositList />
      <ControlButtons>
        <Button>New Deposit</Button>
        <Button>Edit</Button>
      </ControlButtons>
      <DepositAdminForm />
      <DepositAdminList />
    </>
  );
}

export default BudgetAdminLayout;
