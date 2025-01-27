import DashboardLayout from "../features/dashboard/DashboardLayout";
import Heading from "../ui/Heading";
import Row from "../ui/Row";

function Dashboard() {

  return (
    <>
      <Row>
        <Heading>Dashboard</Heading>
        <p>The data resfrash every 8 hours</p>
      </Row>
      <DashboardLayout />
    </>
  );
}

export default Dashboard;
