import styled from "styled-components";
import Stats from "./Stats";
import BalanceCard from "../budget/balance/BalanceCard";
import CampaignsPerformence from "../campaigns/charts/CampaignsChartPerformence";
import ActiveCampaignsList from "../campaigns/activeCampaignsTable/ActiveCampaignsList";
import WarningBanner from "./WarningBanner";

const StyledDashboardLayout = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: auto auto;
  gap: 2.4rem;
`;

function DashboardLayout() {
  return (
    <>
      <WarningBanner />
      <StyledDashboardLayout>
        <Stats />

        <BalanceCard />
        <CampaignsPerformence />
      </StyledDashboardLayout>
      <ActiveCampaignsList />
    </>
  );
}

export default DashboardLayout;
