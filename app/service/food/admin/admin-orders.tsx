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
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
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
  foodName: string;
  portion: string;
  protein: string;
  address: string;
  price?: number;
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
        console.error("Fetch error:", error);
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
        await addBalance(
          order.price || 0,
          `Refund for failed delivery of ${order.foodName}`,
          "food"
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

  // === Analytics ===
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const failedOrders = orders.filter((o) => o.status === "failed").length;
  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + Number(o.price || 0), 0);

  const delivered = orders.filter(
    (o) => o.status === "delivered" && o.createdAt?.toDate
  );
  const weeklyRevenue: Record<string, number> = {};

  delivered.forEach((order) => {
    const date = order.createdAt?.toDate?.() || new Date();
    const week = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
    weeklyRevenue[week] = (weeklyRevenue[week] || 0) + (order.price || 0);
  });

  const weeks = Object.keys(weeklyRevenue).sort();
  const revenues = weeks.map((w) => weeklyRevenue[w]);

  const chartData = {
    labels: ["Delivered", "Pending", "Failed"],
    datasets: [{ data: [deliveredOrders, pendingOrders, failedOrders] }],
  };

  const revenueData = {
    labels: weeks,
    datasets: [
      {
        data: revenues,
        color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
      },
    ],
    legend: ["Weekly Revenue (₦)"],
  };

  const getStatusStyle = (status: string) => ({
    color:
      status === "pending"
        ? "orange"
        : status === "delivered"
        ? "green"
        : "red",
    fontWeight: "bold" as const,
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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🍽️ Food Orders Dashboard</Text>

      {/* === Orders Chart === */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>📊 Order Status Overview</Text>
        <BarChart
          data={chartData}
          width={SCREEN_WIDTH - 40}
          height={220}
          fromZero
          yAxisLabel=""
          yAxisSuffix=""
          showValuesOnTopOfBars
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
            labelColor: () => "#333",
          }}
          style={{ borderRadius: 12 }}
        />
      </Card>

      {weeks.length > 0 && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>📈 Weekly Revenue Trend</Text>
          <LineChart
            data={revenueData}
            width={SCREEN_WIDTH - 40}
            height={220}
            yAxisLabel="₦"
            yAxisSuffix=""
            fromZero
            chartConfig={{
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
              labelColor: () => "#333",
            }}
            bezier
            style={{ borderRadius: 12 }}
          />
        </Card>
      )}

      {/* === Summary === */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{totalOrders}</Text>
          <Text>Total Orders</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: "green" }]}>
            {deliveredOrders}
          </Text>
          <Text>Delivered</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: "orange" }]}>
            {pendingOrders}
          </Text>
          <Text>Pending</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: "red" }]}>
            {failedOrders}
          </Text>
          <Text>Failed</Text>
        </Card>
      </View>

      {/* === Revenue === */}
      <Card style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>💰 Total Revenue</Text>
        <Text style={styles.revenueValue}>
          ₦{Number(totalRevenue || 0).toLocaleString()}
        </Text>
      </Card>

      {/* === Orders List === */}
      {orders.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No orders available.
        </Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <Card style={styles.orderCard}>
              <Text style={styles.foodName}>{item.foodName || "Unnamed Food"}</Text>
              <Text>👤 {item.buyerName || "Unknown Buyer"}</Text>
              <Text>
                📦 {item.portion || "N/A"} • {item.protein || "N/A"}
              </Text>
              <Text style={styles.address}>
                🏠 {item.address || "No address provided"}
              </Text>
              <Text style={styles.price}>
                ₦{Number(item.price || 0).toLocaleString()}
              </Text>
              <Text style={getStatusStyle(item.status)}>
                Status: {item.status?.toUpperCase?.() || "UNKNOWN"}
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
            </Card>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: PRIMARY_COLOR, marginBottom: 12 },
  chartCard: { backgroundColor: CARD_BG, padding: 12, borderRadius: 12, marginBottom: 12 },
  chartTitle: { fontWeight: "600", fontSize: 16, marginBottom: 10 },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: CARD_BG,
    flex: 1,
    margin: 5,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  summaryNumber: { fontSize: 18, fontWeight: "700", color: PRIMARY_COLOR },
  revenueCard: {
    backgroundColor: "#E8EAF6",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  revenueLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  revenueValue: { fontSize: 20, fontWeight: "700", color: PRIMARY_COLOR },
  orderCard: {
    backgroundColor: CARD_BG,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
  },
  foodName: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  address: { color: "#666", fontSize: 13, marginVertical: 4 },
  price: { fontWeight: "bold", color: PRIMARY_COLOR, marginVertical: 4 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
});
