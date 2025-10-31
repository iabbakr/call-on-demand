import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Text,
} from "react-native-paper";
import { useApp } from "../../context/AppContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const CARD_BG = "#F9F9F9";

type Order = {
  id: string;
  buyerId: string;
  buyerName: string;
  foodName: string;
  portion: string;
  protein: string;
  address: string;
  price: number;
  status: "pending" | "delivered" | "failed";
  createdAt?: any;
};

export default function AdminOrders() {
  const { userProfile, addBalance } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;

    const fetchOrders = async () => {
      try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);

        const data = snap.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Order
        );

        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        Alert.alert("Error", "Unable to load orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAdmin]);

  const handleUpdateStatus = async (
    order: Order,
    status: "delivered" | "failed"
  ) => {
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, { status });

      // Notify buyer
      await addDoc(collection(db, "notifications"), {
        userId: order.buyerId,
        message:
          status === "delivered"
            ? `✅ Your order for ${order.foodName} has been delivered successfully.`
            : `❌ Your order for ${order.foodName} could not be delivered. A refund has been processed.`,
        createdAt: serverTimestamp(),
        read: false,
      });

      if (status === "failed") {
        // Refund buyer
        await addBalance(
          order.price,
          `Refund for failed delivery of ${order.foodName}`,
          "food"
        );
      }

      Alert.alert("Success", `Order marked as ${status}.`);

      // Update local list
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status } : o))
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not update order status.");
    }
  };

  const getStatusStyle = (status: string) => ({
    color:
      status === "pending"
        ? "orange"
        : status === "delivered"
        ? "green"
        : "red",
    fontWeight: "bold" as const,
    marginTop: 4,
  });

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>Access Denied: Admins Only</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍽️ Food Orders</Text>

      {orders.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No food orders yet.
        </Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName}>{item.foodName}</Text>
                  <Text>
                    👤 {item.buyerName}{"\n"}
                    📦 {item.portion} • {item.protein}
                  </Text>
                  <Text style={styles.address}>🏠 {item.address}</Text>
                  <Text style={styles.price}>
                    ₦{item.price?.toLocaleString()}
                  </Text>
                  <Text style={getStatusStyle(item.status)}>
                    Status: {item.status.toUpperCase()}
                  </Text>

                  {item.status === "pending" && (
                    <View style={styles.actionRow}>
                      <Button
                        mode="contained"
                        onPress={() => handleUpdateStatus(item, "delivered")}
                        style={{ backgroundColor: PRIMARY_COLOR }}
                      >
                        Delivered
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleUpdateStatus(item, "failed")}
                        textColor="red"
                      >
                        Failed
                      </Button>
                    </View>
                  )}
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR, padding: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginBottom: 12,
  },
  card: {
    backgroundColor: CARD_BG,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
  },
  row: { flexDirection: "row" },
  foodName: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  address: { color: "#666", fontSize: 13, marginVertical: 4 },
  price: { fontWeight: "bold", color: PRIMARY_COLOR, marginVertical: 4 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
});
