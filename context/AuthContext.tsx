import CryptoJS from "crypto-js";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";

export interface ExtraUserData {
  fullName: string;
  username: string;
  phoneNumber: string;
  location: string;
  gender: string;
  pin: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, extraData: ExtraUserData) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  logOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      setUser(current);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, extraData: ExtraUserData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;

    const referralCode = `${extraData.fullName.split(" ")[0].toUpperCase()}${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    const hashedPin = CryptoJS.SHA256(extraData.pin).toString();

    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      fullName: extraData.fullName,
      username: extraData.username,
      phoneNumber: extraData.phoneNumber,
      gender: extraData.gender,
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
      role: "buyer",
    });
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
