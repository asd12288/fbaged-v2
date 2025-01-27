import { useState, useEffect } from "react";
import { useCampaigns } from "../campaigns/useCampaigns";
import { useAccounts } from "./useAccounts";
import { useDeposits } from "./useDeposits";

export function useBudget() {
  const [budgetLow, setBudgetLow] = useState(false);

  const { data: deposits, isPending: depositPending } = useDeposits();
  const { data: campaigns, isPending: campaignsPending } = useCampaigns();
  const { data: accounts, isPending: accountPending } = useAccounts();

  const isPending = depositPending || campaignsPending || accountPending;

  const totalAmounts = deposits?.reduce(
    (cur, deposit) => cur + deposit.amount,
    0
  );

  const totalDailyBudget = campaigns?.reduce(
    (cur, campaign) => cur + campaign.dailyBudget,
    0
  );

  const totalSpent = campaigns?.reduce(
    (cur, campaign) => cur + campaign.amountSpent,
    0
  );

  const totalAccountsCosts = accounts?.reduce(
    (cur, account) => cur + account.totalCost,
    0
  );

  const maintenceFees = accounts?.reduce(
    (acc, account) => acc + account.cost * account.numAccounts,
    0
  );

  const budget = totalAmounts - totalSpent - totalAccountsCosts - maintenceFees; // + exchange fees;
  const positiveBudgetRequired = totalDailyBudget * 3;

  const daysLeft = Math.floor(budget / totalDailyBudget);

  useEffect(() => {
    if (budget > totalDailyBudget * 3) {
      setBudgetLow(false);
    } else {
      setBudgetLow(true);
    }
  }, [budget, totalDailyBudget]);

  return {
    budget,
    budgetLow,
    positiveBudgetRequired,
    maintenceFees,
    totalDailyBudget,
    daysLeft,
    isPending,
  };
}
