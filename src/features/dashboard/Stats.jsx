import { HiOutlineCursorClick } from "react-icons/hi";
import Stat from "./Stat";
import {
  HiOutlineBanknotes,
  HiOutlineChartBarSquare,
  HiOutlineMegaphone,
} from "react-icons/hi2";
import { useCampaigns } from "../campaigns/useCampaigns";
import { formatCurrency } from "../../utils/helpers";

function Stats() {
  const { isPending, data: campaigns } = useCampaigns();

  if (isPending) return <div>Loading...</div>;

  const acitveCampaigns = campaigns.filter(
    (campaign) => campaign.status === "Active"
  ).length;

  const totalDailyBudget = campaigns.reduce(
    (acc, campaign) => acc + campaign.dailyBudget,
    0
  );

  const totalResults = campaigns.reduce(
    (acc, campaigns) => acc + campaigns.results,
    0
  );

  const totalClicks = campaigns.reduce(
    (acc, campaign) => acc + campaign.clicks,
    0
  );

  return (
    <>
      <Stat
        icon={<HiOutlineMegaphone />}
        title="Active Campaigns"
        value={acitveCampaigns}
        color="blue"
      />
      <Stat
        icon={<HiOutlineBanknotes />}
        title="Total Daily Budget"
        value={formatCurrency(totalDailyBudget)}
        color="red"
      />
      <Stat
        icon={<HiOutlineChartBarSquare />}
        title="Total Results"
        value={totalResults}
        color="indigo"
      />
      <Stat
        icon={<HiOutlineCursorClick />}
        title="Total Clicks"
        value={totalClicks}
        color="green"
      />
    </>
  );
}

export default Stats;
