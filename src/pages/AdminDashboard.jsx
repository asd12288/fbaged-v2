import Heading from "../ui/Heading";
import CampaignsAdminLayout from "../features/admin/CampaignsAdminLayout";
import BudgetAdminLayout from "../features/admin/BudgetAdminLayout";

function AdminDashboard() {
  return (
    <>
      <Heading>Admin dashboard</Heading>
      <CampaignsAdminLayout />
      <BudgetAdminLayout />
    </>
  );
}

export default AdminDashboard;
