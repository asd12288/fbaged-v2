import styled from "styled-components";
import Stats from "./Stats";
import AccountList from "../budget/account/AccountList";
import RemainingPieChart from "./RemainingPieChart";

const StyledDashboardLayout = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: auto auto;
  gap: 2.4rem;
`;

function DashboardLayout() {
  return (
    <StyledDashboardLayout>
      <Stats />
      <AccountList />
      <RemainingPieChart />
    </StyledDashboardLayout>
  );
}

export default DashboardLayout;
