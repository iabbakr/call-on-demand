import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { Button, Card, Text } from "react-native-paper";
import { db } from "../../../../lib/firebase";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PRIMARY_COLOR = "#6200EE";

export default function LaundryAdminAnalytics() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  // === Analytics Calculations ===
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, item) => sum + Number(item.totalPrice || 0),
    0
  );
  const pendingOrders = orders.filter(
    (item) => item.status?.toLowerCase() === "pending"
  ).length;
  const completedOrders = orders.filter(
    (item) =>
      item.status?.toLowerCase() === "completed" ||
      item.status?.toLowerCase() === "delivered"
  ).length;

  // === Chart Data ===
  const chartData = {
    labels: ["Total", "Pending", "Completed"],
    datasets: [
      {
        data: [totalOrders, pendingOrders, completedOrders],
      },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🧺 Laundry Analytics</Text>

      {/* Summary Cards */}
      <View style={styles.row}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Total Orders</Text>
            <Text style={styles.value}>{totalOrders}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Total Revenue</Text>
            <Text style={styles.value}>₦{totalRevenue.toLocaleString()}</Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.row}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Pending</Text>
            <Text style={styles.value}>{pendingOrders}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Completed</Text>
            <Text style={styles.value}>{completedOrders}</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Chart Section */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Order Distribution</Text>
          <BarChart
            data={chartData}
            width={SCREEN_WIDTH - 40}
            height={220}
            fromZero
            showValuesOnTopOfBars
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
              labelColor: () => "#333",
            }}
            style={{ borderRadius: 12 }}
          />
        </Card.Content>
      </Card>

      {/* Recent Orders */}
      <Text style={styles.sectionHeader}>🧾 Recent Laundry Orders</Text>
      {orders.slice(0, 10).map((item) => (
        <Card key={item.id} style={styles.orderCard}>
          <Card.Content>
            <Text>👤 {item.buyerName || "Unknown"}</Text>
            <Text>🏠 {item.address || "No address provided"}</Text>
            <Text style={styles.price}>
              ₦{Number(item.totalPrice || 0).toLocaleString()}
            </Text>
            <Text>Status: {item.status || "Unknown"}</Text>

            <Button
              mode="outlined"
              textColor={PRIMARY_COLOR}
              style={styles.viewBtn}
              onPress={() =>
                router.push(`/service/laundry/invoice?orderId=${item.id}`)
              }
            >
              View Invoice
            </Button>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 16,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  card: {
    width: "48%",
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 2,
  },
  title: { fontSize: 14, color: "#666" },
  value: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 6,
    color: PRIMARY_COLOR,
  },
  chartCard: {
    marginVertical: 20,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 2,
    paddingBottom: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: PRIMARY_COLOR,
  },
  orderCard: {
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    elevation: 2,
    paddingVertical: 4,
  },
  price: { fontWeight: "bold", color: "#000", marginTop: 6 },
  viewBtn: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 1,
    marginTop: 10,
    alignSelf: "flex-start",
  },
});
