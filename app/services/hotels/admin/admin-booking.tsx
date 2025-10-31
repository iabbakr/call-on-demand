import { collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";
import { db } from "../../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const CARD_BG = "#F9F9F9";

type Booking = {
  id: string;
  guestName: string;
  roomType: string;
  price: number;
  status: "pending" | "checked_in" | "checked_out";
  createdAt?: any;
};

export default function AdminBooking() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const snap = await getDocs(collection(db, "hotelBookings"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Booking[];
        setBookings(data);
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Unable to fetch bookings.");
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleUpdateStatus = async (booking: Booking, status: Booking["status"]) => {
    try {
      const ref = doc(db, "hotelBookings", booking.id);
      await updateDoc(ref, { status, updatedAt: serverTimestamp() });
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status } : b))
      );
      Alert.alert("Success", `Booking status updated to ${status}`);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not update booking status.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Booking }) => (
    <Card style={styles.card}>
      <Text style={styles.guest}>{item.guestName}</Text>
      <Text>🛏️ {item.roomType}</Text>
      <Text>💰 ₦{item.price.toLocaleString()}</Text>
      <Text>Status: {item.status.toUpperCase()}</Text>

      {item.status === "pending" && (
        <View style={styles.actionRow}>
          <Button
            mode="contained"
            onPress={() => handleUpdateStatus(item, "checked_in")}
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            Check In
          </Button>
          <Button
            mode="outlined"
            onPress={() => handleUpdateStatus(item, "checked_out")}
            textColor="red"
          >
            Check Out
          </Button>
        </View>
      )}
    </Card>
  );

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={bookings}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={
        <Text style={styles.title}>🏨 Hotel Bookings</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: PRIMARY_COLOR, marginBottom: 12 },
  card: { backgroundColor: CARD_BG, marginBottom: 10, padding: 12, borderRadius: 10 },
  guest: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
});
