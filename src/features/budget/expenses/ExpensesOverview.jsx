import Table from "../../../ui/Table";
import { useAccounts } from "../useAccounts";
import { useDeposits } from "../useDeposits";
import ExpenseRow from "./ExpenseRow";
import { useCampaigns } from "../../campaigns/useCampaigns";

function ExpensesOverview() {
  const { isPending: isPendingAccounts, data: accounts } = useAccounts();
  const { isPending: isPendingDeposits, data: deposits } = useDeposits();
  const { isPending: isPendingCampaigns, data: campaigns } = useCampaigns();

  const maintenceFees = accounts?.reduce(
    (acc, account) => acc + account.cost * account.numAccounts,
    0
  );

  const exchangesFees =
    deposits?.reduce((acc, deposit) => acc + deposit.amount, 0) * 0.05;

  const totalCampaignsSpent = campaigns?.reduce(
    (acc, campaign) => acc + campaign.amountSpent,
    0
  );

  if (isPendingAccounts || isPendingDeposits || isPendingCampaigns)
    return <div>Loading...</div>;

  const expensesData = [
    { type: "Maintence Fees", amount: maintenceFees },
    { type: "Exchanges Fee", amount: exchangesFees },
    { type: "Total Campaigns Spent (Facebook Expenses)", amount: totalCampaignsSpent },
    {
      type: "Total Expenses",
      amount: maintenceFees + exchangesFees + totalCampaignsSpent,
    },
  ];
  return (
    <>
      <Table columns="1fr 1fr">
        <Table.Header>
          <div>Type</div>
          <div>Amount</div>
        </Table.Header>

        <Table.Body
          data={expensesData}
          render={(expense) => <ExpenseRow expense={expense} />}
        />
      </Table>
    </>
  );
}

export default ExpensesOverview;
