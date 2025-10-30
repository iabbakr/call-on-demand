import { router } from "expo-router";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const INACTIVE_COLOR = "#757575";
const HEADER_BG = "#F5F5F5";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: any;
  reference?: string;
  senderId?: string;
  receiverId?: string;
  senderName?: string;
  receiverName?: string;
  direction?: "sent" | "received";
  name?: string; // computed for display
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      try {
        const transRef = collection(db, "transactions");

        const sentQ = query(
          transRef,
          where("senderId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const recvQ = query(
          transRef,
          where("receiverId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const [sentSnap, recvSnap] = await Promise.all([getDocs(sentQ), getDocs(recvQ)]);

        const getUserName = async (uid?: string) => {
          if (!uid) return "Unknown";
          try {
            const snap = await getDoc(doc(db, "users", uid));
            return snap.exists() ? (snap.data() as any).fullName || "Unknown" : "Unknown";
          } catch {
            return "Unknown";
          }
        };

        const sentTx: Transaction[] = await Promise.all(
          sentSnap.docs.map(async (doc) => {
            const data = doc.data() as Transaction;
            return {
              id: doc.id,
              type: data.type || "—",
              amount: data.amount || 0,
              status: data.status || "pending",
              createdAt: data.createdAt || null,
              senderId: data.senderId,
              receiverId: data.receiverId,
              senderName: data.senderName,
              receiverName: data.receiverName,
              direction: "sent",
              name:
                data.receiverName || (data.receiverId ? await getUserName(data.receiverId) : "Unknown"),
            };
          })
        );

        const recvTx: Transaction[] = await Promise.all(
          recvSnap.docs.map(async (doc) => {
            const data = doc.data() as Transaction;
            return {
              id: doc.id,
              type: data.type || "—",
              amount: data.amount || 0,
              status: data.status || "pending",
              createdAt: data.createdAt || null,
              senderId: data.senderId,
              receiverId: data.receiverId,
              senderName: data.senderName,
              receiverName: data.receiverName,
              direction: "received",
              name:
                data.senderName || (data.senderId ? await getUserName(data.senderId) : "Unknown"),
            };
          })
        );

        const allTx: Transaction[] = [...sentTx, ...recvTx].sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setTransactions(allTx);
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Transaction History</Text>
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet.</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionType}>{item.type}</Text>
                <Text style={styles.transactionDate}>
                  {item.createdAt?.seconds
                    ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                    : "—"}
                </Text>
                <Text style={styles.transactionName}>{item.name}</Text>
              </View>
              <View style={styles.transactionRight}>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: item.status.toLowerCase() === "success" ? PRIMARY_COLOR : "red" },
                  ]}
                >
                  ₦{item.amount?.toLocaleString()}
                </Text>
                <Text style={styles.transactionStatus}>{item.status}</Text>
              </View>
            </View>
          )}
        />
      )}

      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HEADER_BG, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 18, fontWeight: "bold", color: PRIMARY_COLOR, marginBottom: 16 },
  transactionCard: {
    backgroundColor: BACKGROUND_COLOR,
    padding: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  transactionLeft: { flexDirection: "column" },
  transactionType: { fontSize: 15, fontWeight: "bold", color: INACTIVE_COLOR },
  transactionDate: { fontSize: 12, color: "#999" },
  transactionName: { fontSize: 13, color: "#333", fontWeight: "500" },
  transactionRight: { alignItems: "flex-end" },
  transactionAmount: { fontSize: 16, fontWeight: "bold" },
  transactionStatus: { fontSize: 12, color: SECONDARY_COLOR },
  backButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  backButtonText: { color: BACKGROUND_COLOR, fontWeight: "bold" },
  emptyText: { color: INACTIVE_COLOR, textAlign: "center", marginTop: 30 },
});
