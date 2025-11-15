import { useRouter } from "expo-router";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { db } from "../../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";

export default function LaundryAdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const snapshot = await getDocs(collection(db, "laundry_orders"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOrders(data);
    } catch (error) {
      console.error("Error fetching laundry orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "laundry_orders", id), { status });
      Alert.alert("Success", `Order marked as ${status}.`);
      fetchOrders();
    } catch (err) {
      Alert.alert("Error", "Could not update order status.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🧾 Laundry Orders</Text>
      {orders.map((item) => (
        <Card key={item.id} style={styles.card}>
          <Card.Content>
            <Text>👤 {item.buyerName || "Unknown Buyer"}</Text>
            <Text>🏠 {item.address || "No address provided"}</Text>
            <Text>🧺 Shop: {item.shopName}</Text>
            <Text style={styles.price}>
              ₦{Number(item.totalPrice || 0).toLocaleString()}
            </Text>
            <Text>Status: {item.status || "Unknown"}</Text>

            <View style={styles.btnRow}>
              <Button
                mode="outlined"
                textColor={PRIMARY_COLOR}
                onPress={() =>
                  router.push(`/service/laundry/invoice?orderId=${item.id}`)
                }
              >
                View Invoice
              </Button>
              {item.status !== "completed" && (
                <Button
                  mode="contained"
                  onPress={() => updateStatus(item.id, "completed")}
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  Mark Completed
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 22, fontWeight: "bold", color: PRIMARY_COLOR, marginBottom: 16 },
  card: { marginBottom: 12, borderRadius: 10, backgroundColor: "#fff", elevation: 2 },
  price: { fontWeight: "bold", color: "#000", marginVertical: 6 },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
