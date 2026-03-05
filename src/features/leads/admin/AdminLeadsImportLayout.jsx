import { useState } from "react";
import styled from "styled-components";
import Heading from "../../../ui/Heading";
import GridBox from "../../../ui/GridBox";
import LeadsImportForm from "./LeadsImportForm";
import AdminLeadImportsTable from "./AdminLeadImportsTable";

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

function AdminLeadsImportLayout() {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <>
      <Heading as="h2">Leads Distribution</Heading>
      <TabContainer>
        <Tab $active={activeTab === "upload"} onClick={() => setActiveTab("upload")}>
          Upload
        </Tab>
        <Tab
          $active={activeTab === "imports"}
          onClick={() => setActiveTab("imports")}
        >
          Imports
        </Tab>
      </TabContainer>
      <GridBox>
        {activeTab === "upload" ? <LeadsImportForm /> : <AdminLeadImportsTable />}
      </GridBox>
    </>
  );
}

export default AdminLeadsImportLayout;
