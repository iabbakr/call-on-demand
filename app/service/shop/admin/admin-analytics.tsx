import { collection, getDocs, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { ActivityIndicator, Card, Text } from "react-native-paper";
import { db } from "../../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const SCREEN_WIDTH = Dimensions.get("window").width;

// ✅ Define Order type
interface Order {
  id: string;
  category?: string;
  status?: "pending" | "delivered" | "failed";
  totalPrice?: number;
  createdAt?: any;
}

export default function ShopAnalytics() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);

        const data: Order[] = snap.docs
          .map((docSnap) => ({
            ...(docSnap.data() as Order),
            id: docSnap.id, // ✅ moved id last to avoid overwrite
          }))
          .filter((o) => o.category === "shop");

        setOrders(data);
      } catch (err) {
        console.error("Error loading orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );

  // ✅ Analytics calculations
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const failedOrders = orders.filter((o) => o.status === "failed").length;

  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

  // ✅ Weekly revenue breakdown
  const delivered = orders.filter((o) => o.status === "delivered");
  const weeklyRevenue: Record<string, number> = {};

  delivered.forEach((order) => {
    const date = order.createdAt?.toDate?.() || new Date();
    const week = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
    weeklyRevenue[week] = (weeklyRevenue[week] || 0) + (order.totalPrice || 0);
  });

  const weeks = Object.keys(weeklyRevenue).sort();
  const revenues = weeks.map((w) => weeklyRevenue[w]);

  // ✅ Chart datasets
  const chartData = {
    labels: ["Delivered", "Pending", "Failed"],
    datasets: [{ data: [deliveredOrders, pendingOrders, failedOrders] }],
  };

  const revenueData = {
    labels: weeks,
    datasets: [{ data: revenues }],
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Shop Analytics</Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text>Total Orders: {totalOrders}</Text>
          <Text>Delivered: {deliveredOrders}</Text>
          <Text>Pending: {pendingOrders}</Text>
          <Text>Failed: {failedOrders}</Text>
          <Text style={styles.revenue}>
            Total Revenue: ₦{totalRevenue.toLocaleString()}
          </Text>
        </Card.Content>
      </Card>

      <Text style={styles.chartTitle}>Order Status Overview</Text>
      <BarChart
        data={chartData}
        width={SCREEN_WIDTH - 30}
        height={220}
        fromZero
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={chartConfig}
        style={styles.chart}
      />

      <Text style={styles.chartTitle}>Weekly Revenue</Text>
      <LineChart
        data={revenueData}
        width={SCREEN_WIDTH - 30}
        height={220}
        fromZero
        yAxisLabel="₦"
        yAxisSuffix=""
        chartConfig={chartConfig}
        style={styles.chart}
      />
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
  labelColor: () => "#666",
  strokeWidth: 2,
  barPercentage: 0.6,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginBottom: 10,
  },
  card: { marginBottom: 16 },
  revenue: { marginTop: 8, fontWeight: "bold", color: PRIMARY_COLOR },
  chartTitle: { fontWeight: "600", marginTop: 10, color: "#444" },
  chart: { marginVertical: 8, borderRadius: 8 },
});
