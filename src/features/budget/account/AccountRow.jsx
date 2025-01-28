import styled from "styled-components";
import Table from "../../../ui/Table";
import { formatCurrency } from "../../../utils/helpers";

const NumAccount = styled.div`
  font-weight: 500;
  margin-left: 6rem;
`;

const AccountName = styled.div`
  font-size: 1.5rem;
  font-weight: 500;
`;

const StyledCost = styled.div`
  font-size: 1.5rem;
  font-weight: 500;
`;

function AccountRow({
  account: { nameAccount, numAccounts, cost, totalCost },
}) {
  return (
    <Table.Row>
      <AccountName>{nameAccount}</AccountName>
      <NumAccount>{numAccounts}</NumAccount>
      <StyledCost>{formatCurrency(cost)}</StyledCost>
      <StyledCost>{formatCurrency(numAccounts * cost)}</StyledCost>
    </Table.Row>
  );
}

export default AccountRow;
