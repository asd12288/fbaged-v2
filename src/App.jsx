import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";

import GlobalStyles from "./styles/GlobalStyles";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import { useUser } from "./features/auth/useUser";
import { useMaintenance } from "./features/auth/useMaintenanceMode";

import MaintenancePage from "./features/auth/MaintenancePage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Campagins from "./pages/Campagins";
import Budget from "./pages/Budget";
import AdminDashboard from "./pages/AdminDashboard";
import AppLayout from "./ui/AppLayout";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import FullPageSpinner from "./ui/FullPageSpinner";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStyles />
      <Toaster />
      <AppContent />
jj    </QueryClientProvider>
  );
}

function AppContent() {
  const { isMaintenanceMode, isLoading: isMaintenanceLoading } =
    useMaintenance();
  const { user, isLoading: isUserLoading } = useUser();
  const isAdmin = user?.role === "admin";
  const isInMaintenance = isMaintenanceMode && !isAdmin;

  if (isMaintenanceLoading || isUserLoading) {
    return <FullPageSpinner />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login is always accessible */}
        <Route path="login" element={<Login />} />

        {/* Protected routes become MaintenancePage if in maintenance mode and not admin */}
        <Route
          element={
            isInMaintenance ? (
              <MaintenancePage />
            ) : (
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            )
          }
        >
          <Route index element={<Navigate replace to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="campaigns" element={<Campagins />} />
          <Route path="budget" element={<Budget />} />
          <Route path="admin-dashboard" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
