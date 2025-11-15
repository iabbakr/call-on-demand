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
  Dimensions,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";
import { useApp } from "../../../../context/AppContext";
import { db } from "../../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const CARD_BG = "#F9F9F9";
const SCREEN_WIDTH = Dimensions.get("window").width;

type Order = {
  id: string;
  buyerId: string;
  buyerName: string;
  productName: string;
  address: string;
  totalPrice: number;
  quantity: number;
  status: "pending" | "delivered" | "failed";
  category: string;
  createdAt?: any;
};

export default function AdminShopOrders() {
  const { userProfile, addBalance } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;

    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Order)
          .filter((o) => o.category === "shop");
        setOrders(data);
      } catch (error) {
        console.error("Fetch error:", error);
        Alert.alert("Error", "Unable to load shop orders.");
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

      await addDoc(collection(db, "notifications"), {
        userId: order.buyerId,
        message:
          status === "delivered"
            ? `✅ Your order for ${order.productName} has been delivered successfully.`
            : `❌ Your order for ${order.productName} could not be delivered. A refund has been processed.`,
        createdAt: serverTimestamp(),
        read: false,
      });

      if (status === "failed") {
        await addBalance(
          order.totalPrice || 0,
          `Refund for failed delivery of ${order.productName}`,
          "shop"
        );
      }

      Alert.alert("Success", `Order marked as ${status}.`);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status } : o))
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not update order status.");
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛍️ Shop Orders ({orders.length})</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.label}>Order ID: {item.id}</Text>
              <Text>Customer: {item.buyerName}</Text>
              <Text>Product: {item.productName}</Text>
              <Text>Quantity: {item.quantity}</Text>
              <Text>Total: ₦{item.totalPrice?.toLocaleString()}</Text>
              <Text>Status: {item.status}</Text>
              <Text>
                Date:{" "}
                {item.createdAt?.seconds
                  ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                  : "N/A"}
              </Text>

              {item.status === "pending" && (
                <View style={styles.btnRow}>
                  <Button
                    mode="contained"
                    onPress={() => handleUpdateStatus(item, "delivered")}
                    style={[styles.btn, { backgroundColor: "green" }]}
                  >
                    Mark Delivered
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => handleUpdateStatus(item, "failed")}
                    style={[styles.btn, { backgroundColor: "red" }]}
                  >
                    Mark Failed
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginBottom: 12,
  },
  card: {
    backgroundColor: CARD_BG,
    marginVertical: 6,
    borderRadius: 8,
    padding: 6,
  },
  label: { fontWeight: "bold", color: PRIMARY_COLOR },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  btn: { flex: 1, marginHorizontal: 4 },
});
