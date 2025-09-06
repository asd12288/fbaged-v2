import styled from "styled-components";
import GridBox from "../../ui/GridBox";
import Heading from "../../ui/Heading";
import UserCreateForm from "./UserCreateForm";
import UserManagementTable from "./UserManagementTable";

const StyledUsersLayout = styled.div`
  grid-template-columns: 1fr 1.5fr;
  display: grid;
  align-items: start;
  gap: 2.4rem;
`;

function UsersAdminLayout() {
  return (
    <>
      <Heading as="h2">User Management</Heading>
      <GridBox>
        <StyledUsersLayout>
          <UserCreateForm />
          <UserManagementTable />
        </StyledUsersLayout>
      </GridBox>
    </>
  );
}

export default UsersAdminLayout;