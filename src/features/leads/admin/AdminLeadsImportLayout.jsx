import React from "react";
import Heading from "../../../ui/Heading";
import GridBox from "../../../ui/GridBox";
import LeadsImportForm from "./LeadsImportForm";

function AdminLeadsImportLayout() {
  return (
    <>
      <Heading as="h2">Leads Distribution</Heading>
      <GridBox>
        <LeadsImportForm />
      </GridBox>
    </>
  );
}

export default AdminLeadsImportLayout;
