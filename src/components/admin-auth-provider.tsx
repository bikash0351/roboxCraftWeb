
"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth as adminAuth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface AdminAuthContextType {
  admin: User | null; // Can be a Firebase user
  isSuperAdmin: boolean; // Or the hardcoded super admin
  loading: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_USER = 'roboxcraft';
const ADMIN_PASS = 'bikashA1@#';
const SESSION_STORAGE_KEY = 'admin-auth-type'; // Stores 'firebase' or 'superuser'

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for hardcoded superuser session
    try {
      const storedAuthType = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedAuthType === 'superuser') {
        setIsSuperAdmin(true);
      }
    } catch (error) {
        console.error("Could not parse admin auth from session storage", error);
    }
    
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(adminAuth, async (user) => {
        if (user) {
            // Verify if the logged-in user is an admin by checking the 'admins' collection
            const adminRef = doc(db, 'admins', user.uid);
            const adminSnap = await getDoc(adminRef);

            if (adminSnap.exists()) {
                setAdmin(user);
                setIsSuperAdmin(false); // Firebase user takes precedence
                sessionStorage.setItem(SESSION_STORAGE_KEY, 'firebase');
                await setDoc(adminRef, { lastLoginTime: serverTimestamp() }, { merge: true });
            } else {
                // If user is not in 'admins' collection, sign them out from admin context
                await firebaseSignOut(adminAuth);
                setAdmin(null);
            }
        } else {
            // Only set user to null if not a superadmin
            if (!isSuperAdmin) {
                setAdmin(null);
            }
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdmin]);


  const login = async (userIdentifier: string, pass: string) => {
    setLoading(true);
    try {
      // 1. Try Firebase Authentication first
      try {
        await signInWithEmailAndPassword(adminAuth, userIdentifier, pass);
        // onAuthStateChanged will handle the rest
        return true;
      } catch (firebaseError) {
         // 2. If Firebase fails, check for hardcoded superuser
        if (userIdentifier === ADMIN_USER && pass === ADMIN_PASS) {
            setAdmin(null); // Not a firebase user
            setIsSuperAdmin(true);
            sessionStorage.setItem(SESSION_STORAGE_KEY, 'superuser');
            return true;
        }
        // If both fail, throw the original Firebase error for feedback
        throw firebaseError;
      }
    } catch (error) {
      console.error("Admin login failed:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (admin) {
        await firebaseSignOut(adminAuth);
    }
    setAdmin(null);
    setIsSuperAdmin(false);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    router.push('/admin/login');
  };

  const value = {
    admin,
    isSuperAdmin,
    loading,
    login,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={{
        ...value,
        // Provide a consistent boolean for checking auth status in components
        admin: value.isSuperAdmin || value.admin ? (value.admin as any || true) : null 
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export { useAdminAuth } from "@/hooks/use-admin-auth";
