import Heading from "../ui/Heading";
import CampaignsAdminLayout from "../features/admin/CampaignsAdminLayout";
import BudgetAdminLayout from "../features/admin/BudgetAdminLayout";
import AccountAdminLayout from "../features/admin/AccountAdminLayout";
import { useUser } from "../features/auth/useUser";
import AdminControls from "../features/admin/AdminControls";

function AdminDashboard() {
  const { user } = useUser();

  if (user.role !== "admin") {
    return <Heading>Access denied</Heading>;
  }


  return (
    <>
      <Heading>Admin dashboard</Heading>
      <AdminControls />
      <CampaignsAdminLayout />
      <BudgetAdminLayout />
      <AccountAdminLayout />
    </>
  );
}

export default AdminDashboard;
