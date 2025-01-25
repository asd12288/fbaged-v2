import styled from "styled-components";
import CampaignLineChart from "./CampaignLineChart";
import CampaignPieChart from "./CampaignPieChart";

const StyledCampaignsCharts = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr 1fr;
`;

function CampaignDashboard() {
  return (
    <StyledCampaignsCharts>
      <CampaignLineChart />
      <CampaignPieChart />
    </StyledCampaignsCharts>
  );
}

export default CampaignDashboard;
