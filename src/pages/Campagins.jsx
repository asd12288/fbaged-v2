import { useState } from "react";
import styled from "styled-components";
import DailyCampaignStats from "../features/campaigns/activeCampaignsTable/DailyCampaignStats";
import CampaignList from "../features/campaigns/fullCampaigns/CampaignList";
import WarningBanner from "../features/dashboard/WarningBanner";
import Heading from "../ui/Heading";

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 2.4rem;
  border-bottom: 1px solid var(--color-grey-200);
`;

const Tab = styled.button`
  background: none;
  border: none;
  padding: 1.2rem 2.4rem;
  font-size: 1.6rem;
  font-weight: 600;
  color: ${(props) =>
    props.active ? "var(--color-brand-600)" : "var(--color-grey-500)"};
  border-bottom: 2px solid
    ${(props) => (props.active ? "var(--color-brand-600)" : "transparent")};
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    color: var(--color-brand-600);
  }
`;

const Container = styled.div`
  margin-top: 2.4rem;
`;

function Campagins() {
  const [activeTab, setActiveTab] = useState("stats");

  return (
    <>
      <Heading>Campaigns</Heading>
      <WarningBanner />

      <TabContainer>
        <Tab
          active={activeTab === "stats"}
          onClick={() => setActiveTab("stats")}
        >
          Daily Campaign Stats
        </Tab>
        <Tab active={activeTab === "list"} onClick={() => setActiveTab("list")}>
          Campaign List
        </Tab>
      </TabContainer>

      <Container>
        {activeTab === "stats" && <DailyCampaignStats />}
        {activeTab === "list" && <CampaignList />}
      </Container>
    </>
  );
}

export default Campagins;
