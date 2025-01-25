import styled from "styled-components";
import { formatCurrency } from "../../../utils/helpers";
import Table from "../../../ui/Table";
import Tag from "../../../ui/Tag";

const Amount = styled.div`
  font-family: "Sono";
  font-family: 500;
`;

const Stacked = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  & span:first-child {
    font-size: 0.2rem;
  }

  & span:last-child {
    font-weight: 400;
    font-size: 1.5rem;
  }
`;

function DepositRow({ deposit: { amount, dateAdded, type } }) {
  return (
    <Table.Row>
      <div>{formatCurrency(amount)}</div>
      <Tag variant={type}>{type}</Tag>
      <div>{dateAdded}</div>
    </Table.Row>
  );
}

export default DepositRow;
