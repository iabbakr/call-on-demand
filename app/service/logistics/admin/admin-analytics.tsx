import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { Card, Text } from "react-native-paper";
import { db } from "../../../../lib/firebase";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PRIMARY_COLOR = "#6200EE";

export default function AdminAnalytics() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const snap = await getDocs(collection(db, "logistics_orders"));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchOrders();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY_COLOR} /></View>;

  const totalOrders = orders.length;
  const pending = orders.filter(o => o.status === "pending").length;
  const approved = orders.filter(o => o.status === "approved").length;
  const rejected = orders.filter(o => o.status === "rejected").length;

  const chartData = { labels: ["Approved", "Pending", "Rejected"], datasets: [{ data: [approved, pending, rejected] }] };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>📊 Logistics Analytics</Text>
      <Card style={styles.card}>
        <Card.Content>
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
                color: (opacity = 1) => `rgba(98,0,238,${opacity})`,
                labelColor: () => "#333",
            }}
            style={{ borderRadius: 12 }}
        />

        </Card.Content>
      </Card>
      <Card style={styles.card}>
        <Card.Content>
          <Text>Total Orders: {totalOrders}</Text>
          <Text>Approved: {approved}</Text>
          <Text>Pending: {pending}</Text>
          <Text>Rejected: {rejected}</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8f8f8" },
  center: { flex:1, justifyContent:"center", alignItems:"center" },
  header: { fontSize:22, fontWeight:"bold", color:PRIMARY_COLOR, marginBottom:16 },
  card: { marginBottom:12, borderRadius:12, padding:12 },
});
