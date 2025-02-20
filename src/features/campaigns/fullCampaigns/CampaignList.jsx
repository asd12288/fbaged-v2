import { useCampaigns } from "../useCampaigns";
import Table from "../../../ui/Table";
import CampaignRow from "./CampaignRow";
import Tooltip from "../../../ui/Tooltip";
import Spinner from "../../../ui/Spinner";

function CampaignList() {
  const { isPending, data: campaigns } = useCampaigns();

  if (isPending) return <Spinner />;

  return (
    <>
      <Table
        type="compact"
        columns="2fr 1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
      >
        <Table.Header type="compact">
          <Tooltip content="Campaign Name">
            <div>Campaign Name</div>
          </Tooltip>
          <Tooltip content="The current status (e.g., active, paused)">
            <div>Status</div>
          </Tooltip>
          <Tooltip content="leads generated from the campaign on the last 24 hours">
            <div>Daily Results</div>
          </Tooltip>
          <Tooltip content="Number of results generated">
            <div>Results</div>
          </Tooltip>
          <Tooltip content="Number of unique people who saw your ads">
            <div>Reaches</div>
          </Tooltip>
          <Tooltip content="Total ad impressions">
            <div>Impressions</div>
          </Tooltip>
          <Tooltip content="Number of link clicks on the ad">
            <div>Link Clicks</div>
          </Tooltip>
          <Tooltip content="Cost per 1,000 impressions">
            <div>CPM</div>
          </Tooltip>
          <Tooltip content="Cost per click on the link">
            <div>CPC</div>
          </Tooltip>
          <Tooltip content="Click-through rate">
            <div>CTR</div>
          </Tooltip>
          <Tooltip content="Total clicks on your ad">
            <div>Clicks</div>
          </Tooltip>
          <Tooltip content="Cost per result">
            <div>CPR</div>
          </Tooltip>
          <Tooltip content="Total amount spent on this campaign">
            <div>Amount Spent</div>
          </Tooltip>
          <Tooltip content="Daily budget allocated for this campaign">
            <div>Daily Budget</div>
          </Tooltip>
          <div>image</div>
        </Table.Header>
        <Table.Body
          data={campaigns}
          render={(campaign) => <CampaignRow campaign={campaign} />}
        />
      </Table>
    </>
  );
}

export default CampaignList;
