import { useAccounts } from "../useAccounts";
import Table from "../../../ui/Table";
import AccountRow from "./AccountRow";
import Heading from "../../../ui/Heading";
import { GridLayoutLeft } from "../../../ui/GridLayout2";

function AccountList() {
  const { data: accounts, isPending } = useAccounts();

  if (isPending) return <div>Loading...</div>;
  return (
    <GridLayoutLeft>
      <Table columns="4.5fr 3fr 3fr 3fr" >
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
    </GridLayoutLeft>
  );
}

export default AccountList;
