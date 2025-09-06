import { useState } from "react";
import styled from "styled-components";
import DailyCampaignStats from "../features/campaigns/activeCampaignsTable/DailyCampaignStats";
import CampaignList from "../features/campaigns/fullCampaigns/CampaignList";
import WarningBanner from "../features/dashboard/WarningBanner";
import Heading from "../ui/Heading";
import { useUser } from "../features/auth/useUser";
import { useOptionalAdminScope } from "../features/admin/AdminScopeContext";

const Notice = styled.div`
  background-color: var(--color-yellow-100);
  border: 1px solid var(--color-yellow-300);
  color: var(--color-yellow-900);
  padding: 1.2rem 1.6rem;
  border-radius: var(--border-radius-sm);
  margin-top: 1.2rem;
`;

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
  const { user } = useUser();
  const scope = useOptionalAdminScope();
  const needsSelection = user?.role === "admin" && !scope?.selectedUserId;

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
        {needsSelection && (
          <Notice>Select a user from the sidebar to view data.</Notice>
        )}
        {activeTab === "stats" && <DailyCampaignStats />}
        {activeTab === "list" && <CampaignList />}
      </Container>
    </>
  );
}

export default Campagins;
