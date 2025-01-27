import styled from "styled-components";
import GridBox from "../../ui/GridBox";
import Heading from "../../ui/Heading";
import AccountAddAdminForm from "./AccountAddAdminForm";
import AccountEditAdmin from "./AccountEditAdmin";

const StyledAccountLayout = styled.div`
  grid-template-columns: 1fr 1.5fr;
  display: grid;
  align-items: center;
  gap: 2.4rem;
`;

function AccountAdminLayout() {
  return (
    <>
      <Heading as={"h2"}>Account Admin</Heading>
      <GridBox>
        {/* <StyledLayout>
          <DepositAddAdminForm />
          <DepositEditAdmin />
        </StyledLayout> */}

        <StyledAccountLayout>
          <AccountAddAdminForm />
          <AccountEditAdmin />
        </StyledAccountLayout>
      </GridBox>
    </>
  );
}

export default AccountAdminLayout;
