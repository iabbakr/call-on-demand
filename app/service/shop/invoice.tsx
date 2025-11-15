import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Button, Card, Divider, Text } from "react-native-paper";
import { db } from "../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

export default function ShopInvoiceScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const ref = doc(db, "orders", orderId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() });
        } else {
          Alert.alert("Error", "Order not found.");
        }
      } catch (err) {
        Alert.alert("Error", "Failed to fetch order details.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const generatePDF = async () => {
    if (!order) return;

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial; padding: 20px; color: #333; }
            h1, h2 { color: #6200EE; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            .footer { margin-top: 40px; text-align: center; font-size: 13px; color: #666; }
          </style>
        </head>
        <body>
          <h1>CallonDemand - Shop Purchase Invoice</h1>
          <h3>Invoice ID: ${order.id}</h3>
          <p><strong>Customer:</strong> ${order.buyerName}</p>
          <p><strong>Address:</strong> ${order.address}</p>
          <p><strong>Date:</strong> ${new Date(order.createdAt?.seconds * 1000).toLocaleString()}</p>

          <h2>Order Summary</h2>
          <table>
            <tr><th>Item</th><th>Details</th></tr>
            <tr><td>Product</td><td>${order.productName || "N/A"}</td></tr>
            <tr><td>Quantity</td><td>${order.quantity || 1}</td></tr>
            <tr><td>Price</td><td>₦${order.price?.toLocaleString() || "0"}</td></tr>
            ${
              order.additionalItems?.length
                ? `<tr><td>Extras</td><td>${order.additionalItems
                    .map((e: any) => e.name)
                    .join(", ")}</td></tr>`
                : ""
            }
          </table>

          <h2>Total: ₦${order.totalPrice?.toLocaleString() || "0"}</h2>
          <p><strong>Status:</strong> ${order.status || "Pending"}</p>

          <div class="footer">
            <p>For complaints or inquiries, call: <strong>08140002708</strong></p>
            <p>Thank you for shopping with us!</p>
          </div>
        </body>
      </html>
    `;

    await Print.printAsync({ html });
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );

  if (!order)
    return (
      <View style={styles.center}>
        <Text>No invoice data found.</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Invoice Summary" titleStyle={{ color: PRIMARY_COLOR }} />
        <Card.Content>
          <Text style={styles.label}>Invoice ID: {order.id}</Text>
          <Text>Product: {order.productName}</Text>
          <Text>Quantity: {order.quantity}</Text>
          <Text>Price: ₦{order.price?.toLocaleString()}</Text>
          {order.additionalItems?.length > 0 && (
            <Text>
              Extras:{" "}
              {order.additionalItems.map((e: any) => e.name).join(", ")}
            </Text>
          )}
          <Divider style={{ marginVertical: 10 }} />
          <Text style={styles.total}>Total: ₦{order.totalPrice?.toLocaleString()}</Text>
          <Text>Status: {order.status}</Text>
          <Text>Address: {order.address}</Text>
          <Text>
            Date:{" "}
            {order.createdAt?.seconds
              ? new Date(order.createdAt.seconds * 1000).toLocaleString()
              : "N/A"}
          </Text>
        </Card.Content>
      </Card>

      <View style={{ marginTop: 20 }}>
        <Button
          mode="contained"
          icon="download"
          onPress={generatePDF}
          style={styles.btn}
        >
          Download Invoice
        </Button>

        <Button
          mode="outlined"
          onPress={() => Alert.alert("Support", "Call 08140002708 for help.")}
          style={{ marginTop: 10 }}
        >
          Contact Support
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { marginBottom: 16 },
  label: { fontWeight: "bold", marginBottom: 6 },
  total: { fontSize: 18, fontWeight: "bold", color: PRIMARY_COLOR },
  btn: { backgroundColor: PRIMARY_COLOR, marginTop: 10 },
});
