import { FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Text, TextInput } from "react-native-paper";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import SecureActionWrapper from "../components/security/SecureActionWrapper";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

export default function SendPage() {
  const { user } = useAuth();
  const { balance, deductBalance, addTransaction } = useApp();
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔍 Helper to find recipient
  const findRecipient = async (identifier: string) => {
    const usersRef = collection(db, "users");

    // Remove @ if username format
    const cleaned = identifier.trim().replace(/^@/, "");

    const queries = [
      query(usersRef, where("username", "==", cleaned)),
      query(usersRef, where("email", "==", cleaned.toLowerCase())),
      query(usersRef, where("phoneNumber", "==", cleaned)),
    ];

    for (let q of queries) {
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0];
      }
    }
    return null;
  };

  // 💸 Actual send logic
  const performSend = async () => {
    if (!receiver.trim()) return Alert.alert("Invalid", "Enter receiver username, email, or phone.");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return Alert.alert("Invalid", "Enter a valid amount.");
    if (amt > balance) return Alert.alert("Insufficient", "You have insufficient balance.");

    try {
      setLoading(true);

      // Find recipient
      const recipientDoc = await findRecipient(receiver);
      if (!recipientDoc) {
        return Alert.alert("Error", "Recipient not found.");
      }

      const recipientData = recipientDoc.data();
      if (recipientData.uid === user?.uid) {
        return Alert.alert("Invalid", "You cannot send funds to yourself.");
      }

      const recipientId = recipientData.uid;
      const recipientRef = doc(db, "users", recipientId);

      // 🔻 Deduct from sender
      await deductBalance(amt, `Sent to ${recipientData.username || receiver}`, "Transfer");

      // 🔺 Add to receiver
      await updateDoc(recipientRef, {
        balance: increment(amt),
      });

      // ✅ Add transaction for receiver
      const receiverTxRef = collection(db, "users", recipientId, "transactions");
      await addDoc(receiverTxRef, {
        description: `Received ₦${amt} from ${user?.email || user?.uid}`,
        amount: amt,
        category: "Transfer",
        type: "credit",
        status: "success",
        date: serverTimestamp(),
      });

      // ✅ Record globally
      await addDoc(collection(db, "transactions"), {
        senderId: user?.uid,
        receiverId: recipientId,
        amount: amt,
        type: "transfer",
        status: "success",
        createdAt: serverTimestamp(),
      });

      Alert.alert("✅ Success", `₦${amt.toLocaleString()} sent to ${recipientData.username || receiver}`);
      setReceiver("");
      setAmount("");
      router.back();
    } catch (err: any) {
      console.error("Send Error:", err);
      Alert.alert("Error", err?.message || "Failed to send funds");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SecureActionWrapper>
      {(secureAction) => (
        <View style={styles.container}>
          <Text style={styles.header}>Send Funds</Text>

          <View style={styles.balanceCard}>
            <Text style={{ color: BACKGROUND_COLOR, fontSize: 12 }}>
              Your wallet balance
            </Text>
            <Text
              style={{ color: BACKGROUND_COLOR, fontSize: 20, fontWeight: "700" }}
            >
              <FontAwesome5 name="coins" size={16} color={BACKGROUND_COLOR} />{" "}
              ₦{balance.toLocaleString()}
            </Text>
          </View>

          <View style={styles.form}>
            <Text>Receiver (Username, Email or Phone)</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. @abu, abu@gmail.com or 08040002708"
              value={receiver}
              onChangeText={setReceiver}
              style={styles.input}
            />

            <Text style={{ marginTop: 8 }}>Amount</Text>
            <TextInput
              mode="outlined"
              keyboardType="numeric"
              placeholder="₦1000"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
            />

            <Pressable
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={() => secureAction(performSend)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={BACKGROUND_COLOR} />
              ) : (
                <Text style={styles.buttonText}>Send</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </SecureActionWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: HEADER_BG },
  header: {
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  form: { backgroundColor: BACKGROUND_COLOR, padding: 12, borderRadius: 8 },
  input: { marginTop: 6, backgroundColor: BACKGROUND_COLOR },
  button: {
    marginTop: 16,
    backgroundColor: PRIMARY_COLOR,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: BACKGROUND_COLOR, fontWeight: "700" },
});
