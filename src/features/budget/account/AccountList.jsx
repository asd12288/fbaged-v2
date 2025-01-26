import { useAccounts } from "../useAccounts";
import Table from "../../../ui/Table";
import AccountRow from "./AccountRow";
import Heading from "../../../ui/Heading";
import GridBox from "../../../ui/GridBox";
import { GridLayoutLeft } from "../../../ui/GridLayout2";

function AccountList() {
  const { data: accounts, isPending } = useAccounts();

  if (isPending) return <div>Loading...</div>;
  return (
    <GridLayoutLeft>
      <GridBox>
        <Heading as="h2">My Accounts</Heading>
        <Table columns="2.5fr 1.5fr 1fr 1fr 2rem" type="compact">
          <Table.Header>
            <div>Account Name</div>
            <div>Num accounts</div>
            <div>Cost</div>
            <div>Total Cost</div>
          </Table.Header>

          <Table.Body
            data={accounts}
            render={(account) => <AccountRow account={account} />}
          />
        </Table>
      </GridBox>
    </GridLayoutLeft>
  );
}

export default AccountList;
