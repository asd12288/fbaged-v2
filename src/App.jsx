import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import GlobalStyles from "./styles/GlobalStyles";
import ProtectedRoute from "./features/auth/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Campagins from "./pages/Campagins";
import Budget from "./pages/Budget";
import AdminDashboard from "./pages/AdminDashboard";
import AppLayout from "./ui/AppLayout";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import NotFoundPage from "./pages/NotFoundPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStyles />
      <Toaster />
      <AppContent />
    </QueryClientProvider>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login is always accessible */}
        <Route path="login" element={<Login />} />
        <Route path="/" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate replace to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="campaigns" element={<Campagins />} />
          <Route path="budget" element={<Budget />} />
          <Route path="admin-dashboard" element={<AdminDashboard />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
