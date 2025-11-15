import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { Button, Card, Text } from "react-native-paper";
import { db } from "../../../../lib/firebase";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PRIMARY_COLOR = "#6200EE";

type Booking = {
  id: string;
  guestName: string;
  roomType: string;
  price: number;
  status: "pending" | "checked_in" | "checked_out";
  createdAt?: any;
};

export default function AdminAnalytics() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const snapshot = await getDocs(collection(db, "hotelBookings"));
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setBookings(data as Booking[]);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.price || 0), 0);
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const checkedIn = bookings.filter((b) => b.status === "checked_in").length;
  const checkedOut = bookings.filter((b) => b.status === "checked_out").length;

  const chartData = {
    labels: ["Pending", "Checked In", "Checked Out"],
    datasets: [{ data: [pendingBookings, checkedIn, checkedOut] }],
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🏨 Hotel Admin Analytics</Text>

      {/* Admin Navigation */}
      <View style={styles.navRow}>
        <Button
          mode="outlined"
          onPress={() => router.push("/service/hotels/admin/admin-booking")}
          style={{ flex: 1, marginRight: 6 }}
        >
          View Bookings
        </Button>
        <Button
          mode="contained"
          onPress={() => router.push("/service/hotels/admin/admin-analytics")}
          style={{ flex: 1 }}
        >
          Analytics
        </Button>
      </View>

      {/* Summary Cards */}
      <View style={styles.row}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Total Bookings</Text>
            <Text style={styles.value}>{totalBookings}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Total Revenue</Text>
            <Text style={styles.value}>
              ₦{Number(totalRevenue).toLocaleString()}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Chart */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Booking Status Overview</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { fontSize: 22, fontWeight: "bold", color: PRIMARY_COLOR, marginBottom: 16 },
  navRow: { flexDirection: "row", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  card: { width: "48%", marginBottom: 16, borderRadius: 12, backgroundColor: "#fff", elevation: 2 },
  title: { fontSize: 14, color: "#666" },
  value: { fontSize: 20, fontWeight: "bold", marginTop: 6, color: PRIMARY_COLOR },
  chartCard: { marginVertical: 20, borderRadius: 12, backgroundColor: "#fff", elevation: 2, paddingBottom: 10 },
  chartTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: "#333" },
});
