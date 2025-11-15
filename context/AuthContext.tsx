import CryptoJS from "crypto-js";
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";

export interface ExtraUserData {
  fullName: string;
  username: string;
  phoneNumber: string;
  location: string;
  gender: string;
  pin: string;
  referral?: string | null;
  bankName?: string | null;
  bankCode?: string | null;
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

const REFERRAL_BONUS = 100; // Coins rewarded for successful referral

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

    const userRef = doc(db, "users", uid);

    const baseUserData = {
      uid,
      email,
      fullName: extraData.fullName,
      username: extraData.username,
      phoneNumber: extraData.phoneNumber,
      gender: extraData.gender,
      location: extraData.location,
      pin: hashedPin,
      bankName: extraData.bankName || null,
      bankCode: extraData.bankCode || null,
      accountName: extraData.accountName || null,
      accountNumber: extraData.accountNumber || null,
      balance: 100, // Signup bonus
      bonusBalance: 0,
      referralCode,
      referralCount: 0,
      referredBy: null,
      paystackRecipientCode: null,
      trustScore: 0,
      createdAt: serverTimestamp(),
      role: "buyer",
    };

    // Create user document first
    await setDoc(userRef, baseUserData);

    // Handle referral if provided
    if (extraData.referral && extraData.referral.trim() !== "") {
      const providedCode = extraData.referral.trim();

      try {
        const usersCol = collection(db, "users");
        const q = query(usersCol, where("referralCode", "==", providedCode));
        const refDocs = await getDocs(q);

        if (!refDocs.empty) {
          const refDoc = refDocs.docs[0];
          const refUid = refDoc.id;
          const refUserRef = doc(db, "users", refUid);

          // Firestore transaction ensures safe updates
          await runTransaction(db, async (transaction) => {
            const refSnap = await transaction.get(refUserRef);
            const newUserSnap = await transaction.get(userRef);

            if (!refSnap.exists() || !newUserSnap.exists()) {
              throw new Error("Referrer or new user not found during transaction");
            }

            const refData = refSnap.data();
            const newUserData = newUserSnap.data();

            const refCurrentBonus = refData.bonusBalance ?? 0;
            const refCurrentCount = refData.referralCount ?? 0;
            const newUserBonus = newUserData.bonusBalance ?? 0;

            transaction.update(refUserRef, {
              referralCount: refCurrentCount + 1,
              bonusBalance: refCurrentBonus + REFERRAL_BONUS,
            });

            transaction.update(userRef, {
              referredBy: refUid,
              bonusBalance: newUserBonus + REFERRAL_BONUS,
            });
          });

          console.log("Referral transaction successful");
        } else {
          console.warn("Invalid referral code:", providedCode);
        }
      } catch (error) {
        console.error("Referral transaction failed:", error);
      }
    }
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
