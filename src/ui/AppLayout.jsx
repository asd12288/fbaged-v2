import { Outlet } from "react-router";
import styled from "styled-components";
import Header from "./Header";
import SideBar from "./SideBar";
import { useUser } from "../features/auth/useUser";
import FullPageSpinner from "./FullPageSpinner";
import { useMaintenance } from "../features/auth/useMaintenceMode";
import { is } from "date-fns/locale";
import MaintenancePage from "../pages/MaintenancePage";

const StyledAppLayout = styled.div`
  display: grid;
  height: 100vh;
  grid-template-columns: 26rem 1fr;
  grid-template-rows: auto 1fr;
`;

const Main = styled.main`
  background-color: var(--color-grey-100);
  padding: 4rem 4.8rem 6.4rem;
  overflow: scroll;
`;

const Container = styled.div`
  max-width: 120rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
`;

function AppLayout() {
  const { user, isLoading } = useUser();
  const { isMaintenanceMode } = useMaintenance();

  if (isLoading) return <FullPageSpinner />;

  if (!user) return null;

  if (isMaintenanceMode && user.role === "user") {
    return <MaintenancePage />;
  }

  return (
    <StyledAppLayout>
      <Header />
      <SideBar />

      <Main>
        <Container>
          <Outlet />
        </Container>
      </Main>
    </StyledAppLayout>
  );
}

export default AppLayout;
