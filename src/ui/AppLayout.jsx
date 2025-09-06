import { Outlet } from "react-router";
import styled from "styled-components";
import Header from "./Header";
import SideBar from "./SideBar";
import { useUser } from "../features/auth/useUser";
import FullPageSpinner from "./FullPageSpinner";
import { useMaintenance } from "../features/auth/useMaintenceMode";
import MaintenancePage from "../pages/MaintenancePage";
import { AdminScopeProvider } from "../features/admin/AdminScopeContext";

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

  const Frame = (
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

  if (user.role === "admin")
    return <AdminScopeProvider>{Frame}</AdminScopeProvider>;
  return Frame;
}

export default AppLayout;
