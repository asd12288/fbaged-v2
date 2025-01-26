import CampaginsPerformenceAll from "../features/campaigns/fullCampaigns/CampaginsPerformenceAll";
import CampaignList from "../features/campaigns/fullCampaigns/CampaignList";
import Heading from "../ui/Heading";

function Campagins() {
  return (
    <>
      <Heading>Campaigns</Heading>
      <CampaignList />
      <CampaginsPerformenceAll />
    </>
  );
}

export default Campagins;
