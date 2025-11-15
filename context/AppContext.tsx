import CryptoJS from "crypto-js";
import * as LocalAuthentication from "expo-local-authentication";
import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getCountFromServer,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

// ----------------------
// TYPES
// ----------------------
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
  trustScore?: number;
  createdAt?: Date;
  role?: "admin" | "seller" | "buyer";
};

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  date: Date;
  status: "pending" | "success" | "failed";
};

interface AppContextProps {
  userProfile: UserProfile | null;
  loading: boolean;
  balance: number;
  bonusBalance: number;
  transactions: Transaction[];
  addBalance: (
    amount: number,
    description: string,
    category: string
  ) => Promise<void>;
  deductBalance: (
    amount: number,
    description: string,
    category: string
  ) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, "id" | "date">) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshBalance: () => Promise<void>;
  secureAction: (action: () => void) => Promise<void>;
  verifyPin: (enteredPin: string) => Promise<void>;
  showPinDialog: boolean;
  setShowPinDialog: React.Dispatch<React.SetStateAction<boolean>>;
}

// ----------------------
// CONTEXT
// ----------------------
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
  refreshBalance: async () => {},
  secureAction: async () => {},
  verifyPin: async () => {},
  showPinDialog: false,
  setShowPinDialog: () => {},
});

// ----------------------
// PROVIDER
// ----------------------
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // 🔐 Secure Action State
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // ----------------------
  // FIRESTORE LISTENERS
  // ----------------------
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
        const data = docSnap.data() as DocumentData;
        const { pin, ...safeProfile } = data;
        setUserProfile({ ...safeProfile } as UserProfile);
        setBalance(safeProfile.balance ?? 0);
        setBonusBalance(safeProfile.bonusBalance ?? 0);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    const txRef = collection(db, "users", user.uid, "transactions");
    const txQuery = query(txRef, orderBy("date", "desc"));
    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      const txs = snapshot.docs.map((d) => {
        const tx = d.data() as DocumentData;
        return {
          id: d.id,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          status: tx.status ?? "success",
          date: tx.date?.toDate?.() || new Date(),
        } as Transaction;
      });
      setTransactions(txs);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTx();
    };
  }, [user]);

  // ----------------------
  // 🔐 SECURE ACTION LOGIC
  // ----------------------
  const secureAction = async (action: () => void) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const savedBiometrics = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && supported.length > 0 && savedBiometrics) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Confirm with Biometrics",
          fallbackLabel: "Use PIN",
        });
        if (result.success) {
          action();
          return;
        }
      }

      // Biometrics unavailable → fallback to PIN
      setPendingAction(() => action);
      setShowPinDialog(true);
    } catch (err) {
      console.log("Biometric Error:", err);
      setPendingAction(() => action);
      setShowPinDialog(true);
    }
  };

  const verifyPin = async (enteredPin: string) => {
    if (!user) return Alert.alert("Error", "User not authenticated.");
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return Alert.alert("Error", "User data not found.");

      const storedHashedPin = userDoc.data().pin;
      const enteredHashed = CryptoJS.SHA256(enteredPin).toString();

      if (enteredHashed === storedHashedPin) {
        setShowPinDialog(false);
        const action = pendingAction;
        setPendingAction(null);
        if (action) action();
      } else {
        Alert.alert("Invalid PIN", "The PIN you entered is incorrect.");
      }
    } catch (error) {
      console.error("PIN verify error:", error);
      Alert.alert("Error", "Could not verify PIN.");
    }
  };

  // ----------------------
  // BALANCE + TX HELPERS
  // ----------------------
  const addTransaction = async (transaction: Omit<Transaction, "id" | "date">) => {
    if (!user) throw new Error("User not authenticated.");
    try {
      const txRef = collection(db, "users", user.uid, "transactions");
      await addDoc(txRef, { ...transaction, date: serverTimestamp() });
      await updateTrustScore(user.uid);
    } catch (err) {
      console.error("Failed to add transaction:", err);
      Alert.alert("Error", "Could not add transaction.");
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error("User not authenticated.");
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, data);
    } catch (err) {
      console.error("Failed to update profile:", err);
      Alert.alert("Error", "Could not update profile.");
    }
  };

  const addBalance = async (amount: number, description: string, category: string) => {
    if (!user) throw new Error("User not authenticated.");
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { balance: increment(Number(amount)) });
      await addTransaction({ description, amount, category, type: "credit", status: "success" });
    } catch (err) {
      console.error("Failed to add balance:", err);
      Alert.alert("Error", "Could not add balance.");
    }
  };

  const deductBalance = async (amount: number, description: string, category: string) => {
    if (!user) throw new Error("User not authenticated.");
    if (amount > balance + bonusBalance) throw new Error("Insufficient balance.");
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { balance: increment(-Number(amount)) });
      await addTransaction({ description, amount, category, type: "debit", status: "success" });
    } catch (err) {
      console.error("Failed to deduct balance:", err);
      Alert.alert("Error", "Could not deduct balance.");
    }
  };

  const updateTrustScore = async (uid: string) => {
    try {
      const txRef = collection(db, "users", uid, "transactions");
      const snapshot = await getCountFromServer(txRef);
      const txCount = snapshot.data().count;
      const trustScore = Math.min(100, 10 + txCount * 5);
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { trustScore });
    } catch (err) {
      console.error("Failed to update trust score:", err);
    }
  };

  const refreshBalance = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setBalance(data.balance ?? 0);
        setBonusBalance(data.bonusBalance ?? 0);
      }
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    }
  };

  // ----------------------
  // VALUE
  // ----------------------
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
    refreshBalance,
    secureAction,
    verifyPin,
    showPinDialog,
    setShowPinDialog,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ----------------------
// HOOK
// ----------------------
export const useApp = () => useContext(AppContext);
