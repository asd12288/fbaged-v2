import CampaignList from "../features/campaigns/CampaignList";
import Heading from "../ui/Heading";
import CampaignsCharts from "../features/campaigns/CampaignsCharts";

function Campagins() {
  return (
    <>
      <Heading as="h2">Campaigns</Heading>
      <CampaignList />
      <CampaignsCharts />
    </>
  );
}

export default Campagins;
