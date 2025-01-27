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
  const { isMaintenanceMode, isLoading: isMaintenanceLoading } = useMaintenance();
  const { user, isLoading: isUserLoading } = useUser();

  // If we're still loading user/maintenance data, show a spinner.
  if (isMaintenanceLoading || isUserLoading) {
    return <FullPageSpinner />;
  }

  const isAdmin = user?.role === "admin";
  const isInMaintenance = isMaintenanceMode && !isAdmin;

  return (
    <BrowserRouter>
      <Routes>
        {/* CASE 1: The entire site is in maintenance for non-admins */}
        {isInMaintenance && (
          <Route path="*" element={<MaintenancePage />} />
        )}

        {/* CASE 2: Not in maintenance or user is admin → show normal routes */}
        {!isInMaintenance && (
          <>
            {/* PUBLIC / LOGIN routes */}
            {!user && (
              <>
                <Route path="/login" element={<Login />} />
                {/*
                  We might want the home path ("/") to go to login if user is not logged in
                  Or you can omit this and let the wildcard (*) below handle it.
                */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                {/* 
                  Any other route – if not logged in – also goes to /login 
                */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            )}

            {/* PROTECTED routes (user is logged in) */}
            {user && (
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                {/* / => redirect to /dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/campaigns" element={<Campagins />} />
                <Route path="/budget" element={<Budget />} />
                
                {/* Only show admin page if user is admin (or you can handle it inside <AdminDashboard> itself) */}
                {isAdmin && (
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                )}

                {/* 404 for protected user → default them back to /dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            )}
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
