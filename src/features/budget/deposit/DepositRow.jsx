import styled from "styled-components";
import { formatCurrency } from "../../../utils/helpers";
import Table from "../../../ui/Table";
import Tag from "../../../ui/Tag";

const DateDiv = styled.div`
  font-size: 1.2rem;
`;

function DepositRow({ deposit: { amount, dateAdded, type } }) {
  return (
    <Table.Row>
      <div>{formatCurrency(amount)}</div>
      <Tag variant={type}>{type}</Tag>
      <DateDiv>{dateAdded}</DateDiv>
    </Table.Row>
  );
}

export default DepositRow;
