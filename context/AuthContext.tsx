import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import CryptoJS from "crypto-js";

// 🔹 Extra user data fields expected during signup
export interface ExtraUserData {
  fullName: string;
  username: string;
  phoneNumber: string;
  location: string;
  pin: string;
  bankName?: string | null;
  accountNumber?: string | null;
}

// 🔹 Auth context definition
interface AuthContextProps {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    extraData: ExtraUserData
  ) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  logOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Track authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 🔹 Sign In
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // 🔹 Sign Up (Firebase Auth + Firestore)
  const signUp = async (
    email: string,
    password: string,
    extraData: ExtraUserData
  ) => {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const { uid } = userCredential.user;

    // Generate a referral code (e.g. "ABUBAKAR1234")
    const referralCode = `${extraData.fullName
      .split(" ")[0]
      .toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;

    // Hash the user's 4-digit PIN
    const hashedPin = CryptoJS.SHA256(extraData.pin).toString();

    // Create Firestore user document
    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      fullName: extraData.fullName,
      username: extraData.username,
      phoneNumber: extraData.phoneNumber,
      location: extraData.location,
      pin: hashedPin,
      bankName: extraData.bankName || null,
      bankCode: null,
      accountName: null,
      accountNumber: extraData.accountNumber || null,
      balance: 100,
      bonusBalance: 0,
      referralCode,
      referralCount: 0,
      referredBy: null,
      paystackRecipientCode: null,
      trustScore: 0,
      createdAt: serverTimestamp(),
    });
  };

  // 🔹 Log Out
  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// 🔹 Hook for using the Auth context
export const useAuth = () => useContext(AuthContext);
