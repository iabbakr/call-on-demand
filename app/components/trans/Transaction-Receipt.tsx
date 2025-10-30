import { db } from "@/lib/firebase";
import * as Print from "expo-print";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";
const INACTIVE_COLOR = "#757575";

export default function TransactionReceipt() {
  const { id } = useLocalSearchParams();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchTransaction = async () => {
      try {
        const snap = await getDoc(doc(db, "transactions", String(id)));
        if (!snap.exists()) {
          setTransaction(null);
          return;
        }

        const data = snap.data();

        // Helper to fetch user fullName
        const getUserName = async (uid: string | undefined) => {
          if (!uid) return "Unknown";
          try {
            const userSnap = await getDoc(doc(db, "users", uid));
            return userSnap.exists() ? (userSnap.data() as any).fullName || "Unknown" : "Unknown";
          } catch {
            return "Unknown";
          }
        };

        const senderName = data.senderName || (data.senderId ? await getUserName(data.senderId) : "Unknown");
        const receiverName = data.receiverName || (data.receiverId ? await getUserName(data.receiverId) : "Unknown");

        setTransaction({ ...data, senderName, receiverName });
      } catch (err) {
        console.error("Error fetching receipt:", err);
        setTransaction(null);
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
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="font-family: Arial; padding: 20px; color: #333;">
          <h2 style="color:${PRIMARY_COLOR}; text-align:center;">Transaction Receipt</h2>
          <hr />
          <p><strong>Transaction ID:</strong> ${id}</p>
          <p><strong>Amount:</strong> ₦${transaction.amount?.toLocaleString()}</p>
          <p><strong>Status:</strong> ${transaction.status || "Pending"}</p>
          <p><strong>Type:</strong> ${transaction.type || "—"}</p>
          <p><strong>Sender:</strong> ${transaction.senderName}</p>
          <p><strong>Receiver:</strong> ${transaction.receiverName}</p>
          <p><strong>Date:</strong> ${
            transaction.createdAt?.seconds
              ? new Date(transaction.createdAt.seconds * 1000).toLocaleString()
              : "—"
          }</p>
          <hr />
          <p style="text-align:center; font-size: 12px; margin-top: 40px; color:#666;">
            Thank you for using our service.
          </p>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.error("Error printing/sharing receipt:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.center}>
        <Text>No receipt found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: PRIMARY_COLOR, fontWeight: "bold" }}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Transaction Receipt</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Transaction ID:</Text>
          <Text style={styles.value}>{id}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Amount:</Text>
          <Text style={styles.value}>₦{transaction.amount?.toLocaleString() || "0.00"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text
            style={[
              styles.value,
              {
                color:
                  transaction.status === "Successful"
                    ? "green"
                    : transaction.status === "Failed"
                    ? "red"
                    : INACTIVE_COLOR,
              },
            ]}
          >
            {transaction.status || "Pending"}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{transaction.type || "—"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Sender:</Text>
          <Text style={styles.value}>{transaction.senderName}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Receiver:</Text>
          <Text style={styles.value}>{transaction.receiverName}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>
            {transaction.createdAt?.seconds
              ? new Date(transaction.createdAt.seconds * 1000).toLocaleString()
              : "—"}
          </Text>
        </View>

        <Pressable onPress={handlePrint} style={styles.printButton}>
          <Text style={styles.printButtonText}>🧾 Print / Share Receipt</Text>
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
    elevation: 3,
  },
  title: { fontSize: 20, fontWeight: "bold", color: PRIMARY_COLOR, marginBottom: 16, textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  label: { fontWeight: "600", color: INACTIVE_COLOR },
  value: { fontWeight: "bold", color: PRIMARY_COLOR },
  printButton: { backgroundColor: PRIMARY_COLOR, padding: 12, borderRadius: 8, alignItems: "center", marginTop: 20 },
  printButtonText: { color: "#fff", fontWeight: "bold" },
  backButton: { paddingVertical: 10, alignItems: "center", marginTop: 10 },
  backButtonText: { color: PRIMARY_COLOR, fontWeight: "bold" },
});
