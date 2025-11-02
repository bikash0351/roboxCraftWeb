
"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  createUserWithEmailPassword: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const handleUser = async (user: User | null) => {
    if (user) {
      // User is signed in, see if they exist in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // Existing user, update last login time
        await setDoc(userRef, { lastLoginTime: serverTimestamp() }, { merge: true });
      } else {
        // This case handles users created by other means (e.g. Google Sign-In previously)
        // For new email/password sign-ups, the user doc is created in the signup function
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          registrationTime: serverTimestamp(),
          lastLoginTime: serverTimestamp(),
        }, { merge: true });
      }
      setUser(user);
    } else {
      // User is signed out
      setUser(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleUser);
    return () => unsubscribe();
  }, []);

  const createUserWithEmailPassword = async (email: string, password: string, displayName: string) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update the user's profile in Firebase Auth
        await updateProfile(user, { displayName });

        // Create the user document in Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            displayName: displayName,
            email: user.email,
            photoURL: user.photoURL,
            registrationTime: serverTimestamp(),
            lastLoginTime: serverTimestamp(),
        });

        // Manually update the state after profile update
        setUser({ ...user, displayName });

    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle setting the user state and updating firestore
    } catch (error) {
        console.error("Error signing in:", error);
        throw error;
    }
  };


  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    user,
    loading,
    createUserWithEmailPassword,
    signInWithEmailPassword,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
