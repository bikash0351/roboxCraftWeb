
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
  admin: User | null; // This is the Firebase User object
  isSuperAdmin: boolean;
  loading: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_USER = 'roboxcraft';
const ADMIN_PASS = 'bikashA1@#';
const SESSION_STORAGE_KEY = 'admin-auth-type';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedAuthType = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedAuthType === 'superuser') {
        setIsSuperAdmin(true);
      }
    } catch (error) {
        console.error("Could not parse admin auth from session storage", error);
    }
    
    const unsubscribe = onAuthStateChanged(adminAuth, async (user) => {
        if (user) {
            const adminRef = doc(db, 'admins', user.uid);
            const adminSnap = await getDoc(adminRef);

            if (adminSnap.exists()) {
                setAdmin(user);
                if (isSuperAdmin) setIsSuperAdmin(false); 
                sessionStorage.setItem(SESSION_STORAGE_KEY, 'firebase');
                await setDoc(adminRef, { lastLoginTime: serverTimestamp() }, { merge: true });
            } else {
                await firebaseSignOut(adminAuth);
                setAdmin(null);
            }
        } else {
            if (!sessionStorage.getItem(SESSION_STORAGE_KEY)) {
              setAdmin(null);
            }
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const login = async (userIdentifier: string, pass: string): Promise<boolean> => {
    setLoading(true);
    // 1. Check for hardcoded superuser first
    if (userIdentifier === ADMIN_USER && pass === ADMIN_PASS) {
      setAdmin(null);
      setIsSuperAdmin(true);
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'superuser');
      setLoading(false);
      return true;
    }

    // 2. If not superuser, try Firebase Authentication
    try {
      await signInWithEmailAndPassword(adminAuth, userIdentifier, pass);
      // onAuthStateChanged will handle the rest
      setLoading(false);
      return true;
    } catch (error) {
      console.error("Admin login failed:", error);
      setLoading(false);
      return false;
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
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export { useAdminAuth } from "@/hooks/use-admin-auth";
