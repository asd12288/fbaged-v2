import styled from "styled-components";
import Heading from "../../ui/Heading";

import DepositAddAdminForm from "./DepositAddAdminForm";
import DepositEditAdmin from "./DepositEditAdmin";
import GridBox from "../../ui/GridBox";

const StyledLayout = styled.div`
  grid-template-columns: 1fr 1.5fr;
  display: grid;
  align-items: center;
  gap: 2.4rem;
`;

function BudgetAdminLayout() {
  return (
    <>
      <Heading as={"h2"}>Budget Admin</Heading>
      <GridBox>
        <StyledLayout>
          <DepositAddAdminForm />
          <DepositEditAdmin />
        </StyledLayout>
      </GridBox>
    </>
  );
}

export default BudgetAdminLayout;
