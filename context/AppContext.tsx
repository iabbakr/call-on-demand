import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  getCountFromServer,
} from "firebase/firestore";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

// ======================
// 🔹 Types
// ======================

export type UserProfile = {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  phoneNumber?: string;
  location?: string;
  bankName?: string | null;
  bankCode?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  photoURL?: string | null;
  referralCode?: string;
  referredBy?: string | null;
  referralCount?: number;
  balance: number;
  bonusBalance: number;
  trustScore?: number; // ✅ Added trust score
  createdAt?: any;
};

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  date: Date;
};

interface AppContextProps {
  userProfile: UserProfile | null;
  loading: boolean;
  balance: number;
  bonusBalance: number;
  transactions: Transaction[];
  addBalance: (amount: number, description: string, category: string) => Promise<void>;
  deductBalance: (amount: number, description: string, category: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, "id" | "date">) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

// ======================
// 🔹 Context
// ======================

const AppContext = createContext<AppContextProps>({
  userProfile: null,
  loading: true,
  balance: 0,
  bonusBalance: 0,
  transactions: [],
  addBalance: async () => {},
  deductBalance: async () => {},
  addTransaction: async () => {},
  updateUserProfile: async () => {},
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // ======================
  // 🔹 Real-time Listeners
  // ======================
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setBalance(0);
      setBonusBalance(0);
      setTransactions([]);
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", user.uid);

    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        // Never expose hashed pin to UI
        const { pin, ...safeProfile } = data as any;
        setUserProfile(safeProfile);
        setBalance(safeProfile.balance || 0);
        setBonusBalance(safeProfile.bonusBalance || 0);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Listen to user transactions
    const txRef = collection(db, "users", user.uid, "transactions");
    const txQuery = query(txRef, orderBy("date", "desc"));
    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      const txs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(),
      })) as Transaction[];
      setTransactions(txs);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTx();
    };
  }, [user]);

  // ======================
  // 🔹 Firestore Actions
  // ======================

  const addTransaction = async (transaction: Omit<Transaction, "id" | "date">) => {
    if (!user) throw new Error("User not authenticated.");
    const txRef = collection(db, "users", user.uid, "transactions");
    await addDoc(txRef, { ...transaction, date: serverTimestamp() });

    // Update trust score whenever a transaction is added
    await updateTrustScore(user.uid);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error("User not authenticated.");
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, data);
  };

  const addBalance = async (amount: number, description: string, category: string) => {
    if (!user) throw new Error("User not authenticated.");
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { balance: increment(amount) });
    await addTransaction({ description, amount, category, type: "credit" });
  };

  const deductBalance = async (amount: number, description: string, category: string) => {
    if (!user) throw new Error("User not authenticated.");
    if (amount > balance + bonusBalance) throw new Error("Insufficient balance.");
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { balance: increment(-amount) });
    await addTransaction({ description, amount, category, type: "debit" });
  };

  // ======================
  // 🔹 Trust Score Logic
  // ======================
  const updateTrustScore = async (uid: string) => {
    const txRef = collection(db, "users", uid, "transactions");
    const snapshot = await getCountFromServer(txRef);
    const txCount = snapshot.data().count;

    // Example: trustScore = min(100, 10 + txCount * 5)
    const trustScore = Math.min(100, 10 + txCount * 5);

    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { trustScore });
  };

  // ======================
  // 🔹 Context Value
  // ======================
  const value: AppContextProps = {
    userProfile,
    loading,
    balance,
    bonusBalance,
    transactions,
    addTransaction,
    addBalance,
    deductBalance,
    updateUserProfile,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
