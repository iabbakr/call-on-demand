import * as Print from "expo-print";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

export default function TransactionReceipt() {
  const { id } = useLocalSearchParams();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchTransaction = async () => {
      try {
        const snap = await getDoc(doc(db, "transactions", id as string));
        if (!snap.exists()) return;

        const data = snap.data();

        // Fetch sender and receiver names if missing
        const getUserName = async (uid: string | undefined) => {
          if (!uid) return "Unknown";
          try {
            const userSnap = await getDoc(doc(db, "users", uid));
            return userSnap.exists() ? userSnap.data().fullName || "Unknown" : "Unknown";
          } catch {
            return "Unknown";
          }
        };

        const senderName = data.senderName || (data.senderId ? await getUserName(data.senderId) : "Unknown");
        const receiverName = data.receiverName || (data.receiverId ? await getUserName(data.receiverId) : "Unknown");

        setTransaction({ ...data, senderName, receiverName });
      } catch (error) {
        console.error("Error loading receipt:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [id]);

  const handlePrint = async () => {
    if (!transaction) return;

    const html = `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h2 style="color: ${PRIMARY_COLOR};">Transaction Receipt</h2>
          <p><strong>Transaction ID:</strong> ${id}</p>
          <p><strong>Sender:</strong> ${transaction.senderName}</p>
          <p><strong>Receiver:</strong> ${transaction.receiverName}</p>
          <p><strong>Amount:</strong> ₦${transaction.amount?.toLocaleString()}</p>
          <p><strong>Status:</strong> ${transaction.status}</p>
          <p><strong>Type:</strong> ${transaction.type}</p>
          <p><strong>Date:</strong> ${transaction.createdAt?.seconds
            ? new Date(transaction.createdAt.seconds * 1000).toLocaleString()
            : "—"}</p>
        </body>
      </html>
    `;
    await Print.printAsync({ html });
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );

  if (!transaction)
    return (
      <View style={styles.center}>
        <Text>No transaction found.</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Transaction Receipt</Text>
        <Text>Transaction ID: {id}</Text>
        <Text>Sender: {transaction.senderName}</Text>
        <Text>Receiver: {transaction.receiverName}</Text>
        <Text>Amount: ₦{transaction.amount?.toLocaleString()}</Text>
        <Text>Status: {transaction.status}</Text>
        <Text>Type: {transaction.type}</Text>
        <Text>
          Date:{" "}
          {transaction.createdAt?.seconds
            ? new Date(transaction.createdAt.seconds * 1000).toLocaleString()
            : "—"}
        </Text>

        <Pressable onPress={handlePrint} style={styles.printButton}>
          <Text style={styles.printButtonText}>🧾 Print Receipt</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HEADER_BG, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: BACKGROUND_COLOR,
    padding: 16,
    borderRadius: 10,
    elevation: 2,
  },
  title: { fontSize: 20, fontWeight: "bold", color: PRIMARY_COLOR, marginBottom: 12 },
  printButton: { backgroundColor: PRIMARY_COLOR, padding: 10, borderRadius: 8, alignItems: "center", marginTop: 20 },
  printButtonText: { color: "#fff", fontWeight: "bold" },
  backButton: { marginTop: 10, paddingVertical: 10, alignItems: "center" },
  backButtonText: { color: PRIMARY_COLOR, fontWeight: "bold" },
});
