import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";

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
import FullPageSpinner from "./ui/FullPageSpinner";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStyles />
      <Toaster />
      <AppContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

function AppContent() {
  const { isMaintenanceMode, isLoading: isMaintenanceLoading } =
    useMaintenance();
  const { user, isLoading: isUserLoading } = useUser();

  if (isMaintenanceLoading || isUserLoading) {
    return <FullPageSpinner />;
  }

  const isAdmin = user?.role === "admin";
  const isInMaintenance = isMaintenanceMode && !isAdmin;

  return (
    <BrowserRouter>
      <Routes>
        {/* 1) Always allow /login */}
        <Route path="/login" element={<Login />} />

        {/*
          2) If site is in maintenance mode for non-admins, any route other than /login -> MaintenancePage.
             But we've already allowed the user to visit /login.
        */}
        {isInMaintenance && <Route path="*" element={<MaintenancePage />} />}

        {/*
          3) If NOT in maintenance mode (or if user is admin):
             - If there's no user -> everything else goes to /login
             - If there's a user -> render protected routes
        */}
        {!isInMaintenance && !user && (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}

        {!isInMaintenance && user && (
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Base path -> redirect to /dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campagins />} />
            <Route path="/budget" element={<Budget />} />

            {isAdmin && (
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            )}

            {/* Fallback for any unknown path -> go to /dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
