import CampaginsPerformenceAll from "../features/campaigns/fullCampaigns/CampaginsPerformenceAll";
import CampaignList from "../features/campaigns/fullCampaigns/CampaignList";
import WarningBanner from "../features/dashboard/WarningBanner";
import Heading from "../ui/Heading";

function Campagins() {
  return (
    <>
      <Heading>Campaigns</Heading>
      <WarningBanner />
      <CampaignList />
      <CampaginsPerformenceAll />
    </>
  );
}

export default Campagins;
