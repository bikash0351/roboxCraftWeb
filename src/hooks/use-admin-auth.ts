
"use client";

import { useContext } from "react";
import { AdminAuthContext } from "@/components/admin-auth-provider";
import type { User } from "firebase/auth";

// A custom hook to consume the AdminAuthContext
export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  
  return {
    admin: context.admin || context.isSuperAdmin,
    isSuperAdmin: context.isSuperAdmin,
    firebaseUser: context.admin,
    loading: context.loading,
    login: context.login,
    logout: context.logout,
  };
};
