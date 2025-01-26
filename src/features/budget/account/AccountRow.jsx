import styled from "styled-components";
import Table from "../../../ui/Table";
import { formatCurrency } from "../../../utils/helpers";

const NumAccount = styled.div`
  font-size: 1.2rem;
`;

const AccountName = styled.div`
  text-align: left;
`;

function AccountRow({
  account: { nameAccount, numAccounts, cost, totalCost },
}) {
  return (
    <Table.Row>
      <AccountName>{nameAccount}</AccountName>
      <NumAccount>{numAccounts}</NumAccount>
      <div>{formatCurrency(cost)}</div>
      <div>{formatCurrency(numAccounts * cost)}</div>
    </Table.Row>
  );
}

export default AccountRow;
