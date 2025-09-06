/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react/prop-types */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useUsers } from "../users/useUsers";

const AdminScopeCtx = createContext(null);

export function AdminScopeProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: users } = useUsers();
  const params = new URLSearchParams(location.search);
  const initial = params.get("user") || null;
  const [selectedUserId, setSelectedUserId] = useState(initial);

  const selectedUser = useMemo(
    () => users?.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const cur = p.get("user") || null;
    if (cur !== selectedUserId) {
      if (selectedUserId) p.set("user", selectedUserId);
      else p.delete("user");
      navigate(`${location.pathname}?${p.toString()}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const value = useMemo(
    () => ({ selectedUserId, selectedUser, setSelectedUserId }),
    [selectedUserId, selectedUser]
  );

  return (
    <AdminScopeCtx.Provider value={value}>{children}</AdminScopeCtx.Provider>
  );
}

export function useAdminScope() {
  const ctx = useContext(AdminScopeCtx);
  if (!ctx)
    throw new Error("useAdminScope must be used within AdminScopeProvider");
  return ctx;
}

// Optional variant that returns null if not wrapped – useful inside generic hooks
export function useOptionalAdminScope() {
  return useContext(AdminScopeCtx);
}
