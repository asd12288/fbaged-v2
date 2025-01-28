import styled from "styled-components";
import Table from "../../../ui/Table";
import { formatCurrency } from "../../../utils/helpers";

const Expense = styled.div`
  font-size: ${(props) => (props.isTotal ? "1.8rem" : "1.5rem")};
  font-weight: ${(props) => (props.isTotal ? "700" : "500")};
  margin-top: ${(props) => (props.isTotal ? "1.2rem" : "0")};
`;

const Amount = styled.div`
  font-size: ${(props) => (props.isTotal ? "1.8rem" : "1.5rem")};

  font-weight: ${(props) => (props.isTotal ? "700" : "500")};
`;

function ExpenseRow({ expense: { type, amount } }) {
  const isTotal = type === "Total Expenses";

  return (
    <Table.Row>
      <Expense isTotal={isTotal}>{type}</Expense>
      <Amount isTotal={isTotal}>{formatCurrency(amount)}</Amount>
    </Table.Row>
  );
}

export default ExpenseRow;
