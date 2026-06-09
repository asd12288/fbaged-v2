import { useState } from "react";
import styled from "styled-components";
import Heading from "../../../ui/Heading";
import GridBox from "../../../ui/GridBox";
import { useSimClients } from "../hooks/useSimClients";
import SimClientsPanel from "./SimClientsPanel";
import SimDripsPanel from "./SimDripsPanel";

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 1.6rem;
  border-bottom: 1px solid var(--color-grey-200);
  width: 100%;
`;

const Tab = styled.button`
  background: none;
  border: none;
  padding: 1rem 1.6rem;
  font-size: 1.4rem;
  font-weight: 600;
  color: ${(props) =>
    props.$active ? "var(--color-brand-600)" : "var(--color-grey-500)"};
  border-bottom: 2px solid
    ${(props) => (props.$active ? "var(--color-brand-600)" : "transparent")};
  cursor: pointer;
`;

export default function LeadSimLayout() {
  const { clients, isPending } = useSimClients();
  const hasClients = !isPending && clients.length > 0;

  const [activeSubTab, setActiveSubTab] = useState(null); // resolved on first render
  const [preselectedClientId, setPreselectedClientId] = useState(null);

  // Default: open "Drips" if clients exist, else "Clients".
  const resolvedTab = activeSubTab || (hasClients ? "drips" : "clients");

  function openClient(client) {
    setPreselectedClientId(client.id);
    setActiveSubTab("drips");
  }

  return (
    <>
      <Heading as="h2">Lead Sim</Heading>
      <TabContainer>
        <Tab
          $active={resolvedTab === "clients"}
          onClick={() => setActiveSubTab("clients")}
        >
          Clients
        </Tab>
        <Tab
          $active={resolvedTab === "drips"}
          onClick={() => setActiveSubTab("drips")}
        >
          Drips
        </Tab>
      </TabContainer>
      <GridBox>
        {resolvedTab === "clients" ? (
          <SimClientsPanel onOpenClient={openClient} />
        ) : (
          <SimDripsPanel initialClientId={preselectedClientId} />
        )}
      </GridBox>
    </>
  );
}
