import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Divider, Text } from "react-native-paper";
import { db } from "../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

type Extra = {
  name: string;
  quantity: number;
};

type Booking = {
  id: string;
  buyerName: string;
  hotelName: string;
  roomCount: number;
  extras?: Extra[];
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: string;
};

export default function HotelInvoiceScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const snap = await getDoc(doc(db, "bookings", bookingId));
        if (snap.exists()) setBooking({ id: snap.id, ...snap.data() } as Booking);
        else Alert.alert("Error", "Booking not found.");
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to fetch booking details.");
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId]);

  const generatePDF = async () => {
    if (!booking) return;

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
          <h1>CallonDemand - Hotel Booking Invoice</h1>
          <h3>Booking ID: ${booking.id}</h3>
          <p><strong>Customer:</strong> ${booking.buyerName}</p>
          <p><strong>Check-In:</strong> ${new Date(booking.checkIn).toLocaleDateString()}</p>
          <p><strong>Check-Out:</strong> ${new Date(booking.checkOut).toLocaleDateString()}</p>

          <h2>Booking Summary</h2>
          <table>
            <tr><th>Hotel</th><th>Details</th></tr>
            <tr><td>Name</td><td>${booking.hotelName}</td></tr>
            <tr><td>Rooms</td><td>${booking.roomCount}</td></tr>
            <tr><td>Extras</td><td>${booking.extras?.length ? booking.extras.map(e => `${e.name} x${e.quantity}`).join(", ") : "None"}</td></tr>
          </table>

          <h2>Total: ₦${(booking.totalPrice ?? 0).toLocaleString()}</h2>
          <p><strong>Status:</strong> ${booking.status}</p>

          <div class="footer">
            <p>For complaints or delay, call: <strong>08140002708</strong></p>
            <p>Thank you for your booking!</p>
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

  if (!booking)
    return (
      <View style={styles.center}>
        <Text>No booking data found.</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      <Card style={styles.card}>
        <Card.Title title="Booking Invoice" titleStyle={{ color: PRIMARY_COLOR }} />
        <Card.Content>
          <Text style={styles.label}>Booking ID: {booking.id}</Text>
          <Text>Hotel: {booking.hotelName}</Text>
          <Text>Rooms: {booking.roomCount}</Text>
          <Text>
            Extras: {booking.extras?.length ? booking.extras.map(e => `${e.name} x${e.quantity}`).join(", ") : "None"}
          </Text>
          <Text>Check-In: {new Date(booking.checkIn).toLocaleDateString()}</Text>
          <Text>Check-Out: {new Date(booking.checkOut).toLocaleDateString()}</Text>
          <Divider style={{ marginVertical: 10 }} />
          <Text style={styles.total}>Total: ₦{(booking.totalPrice ?? 0).toLocaleString()}</Text>
          <Text>Status: {booking.status}</Text>
        </Card.Content>
      </Card>

      <View style={{ marginTop: 20 }}>
        <Button mode="contained" icon="download" onPress={generatePDF} style={styles.btn}>
          Download Invoice
        </Button>

        <Button mode="outlined" onPress={() => Alert.alert("Support", "Call 08140002708 for help.")} style={{ marginTop: 10 }}>
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
