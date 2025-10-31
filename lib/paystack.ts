// lib/paystack.ts
import axios from "axios";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const PAYSTACK_SECRET_KEY = process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY || ""; // Keep safe in production
const PAYSTACK_BASE_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  console.warn("Warning: Paystack secret key is not configured!");
}

// ------------------------ Types ------------------------
export interface PaystackTransactionData {
  authorization_url: string;
  access_code: string;
  reference: string;
  amount: number;
  currency: string;
  email: string;
  status: string;
}

// ------------------------ Initialize Payment ------------------------
export async function initializePayment(
  email: string,
  amount: number // in Naira
): Promise<PaystackTransactionData> {
  if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack secret key not configured.");

  try {
    const res = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      { email, amount: amount * 100, currency: "NGN" }, // amount in kobo
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    if (!res.data.status || !res.data.data) throw new Error(res.data.message || "Failed to initialize transaction");

    // Create Firestore transaction immediately
    await setDoc(doc(db, "transactions", res.data.data.reference), {
      reference: res.data.data.reference,
      email,
      amount,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    return res.data.data as PaystackTransactionData;
  } catch (err: any) {
    console.error("Paystack Init Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Error initializing transaction.");
  }
}

// ------------------------ Verify Payment ------------------------
export async function verifyPayment(reference: string, userId: string) {
  if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack secret key not configured.");

  try {
    const res = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });

    if (!res.data.status || !res.data.data) throw new Error("Payment verification failed");

    const txnDocRef = doc(db, "transactions", reference);
    const txnSnap = await getDoc(txnDocRef);
    if (!txnSnap.exists()) throw new Error("Transaction not found in Firestore");

    if (res.data.data.status === "success") {
      // Update transaction status
      await updateDoc(txnDocRef, { status: "success", verifiedAt: serverTimestamp() });

      // Credit user's wallet
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");

      const currentBalance = userSnap.data()?.balance || 0;
      await updateDoc(userRef, { balance: currentBalance + txnSnap.data().amount });

      return { success: true, message: "Wallet credited successfully" };
    } else {
      await updateDoc(txnDocRef, { status: "failed" });
      return { success: false, message: "Payment not completed" };
    }
  } catch (err: any) {
    console.error("Paystack Verify Error:", err.response?.data || err.message);
    throw new Error(err?.message || "Error verifying transaction.");
  }
}
