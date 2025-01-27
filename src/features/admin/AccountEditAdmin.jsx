import Table from "../../ui/Table";
import { useAccounts } from "../budget/useAccounts";
import AccountEditRowAdmin from "./AccountEditRowAdmin";

function AccountEditAdmin() {
  const { data: accounts, isPending } = useAccounts();

  if (isPending) return <div>Loading...</div>;

  return (
    <div>
      <Table columns="2fr 1fr 1fr 1fr" type="compact">
        <Table.Header>
          <th>Account name</th>
          <th>Number of accounts</th>
          <th>Cost</th>
          <th>Actions</th>
        </Table.Header>
        <Table.Body
          data={accounts}
          render={(account) => (
            <AccountEditRowAdmin key={account.id} account={account} />
          )}
        />
      </Table>
    </div>
  );
}

export default AccountEditAdmin;
