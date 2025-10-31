import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, Text, TextInput } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { useSecureAction } from "../../../hooks/useSecureAction";
import { db } from "../../../lib/firebase";
import PinDialog from "../../components/security/PinDialog";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

type SelectableItem = {
  name: string;
  price: number;
  quantity?: number;
};

type ItemCategoryProps = {
  title: string;
  items: SelectableItem[];
  selected: SelectableItem[];
  onToggle: (item: SelectableItem) => void;
  onChangeQty?: (name: string, delta: number) => void;
};

const ItemCategory = ({ title, items, selected, onToggle, onChangeQty }: ItemCategoryProps) => {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.flexWrap}>
        {items.map((item) => {
          const isSelected = selected.find((x) => x.name === item.name);
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.itemCard, isSelected && styles.itemSelected]}
              onPress={() => onToggle(item)}
            >
              <Text style={styles.itemText}>{item.name}</Text>
              <Text style={styles.itemPrice}>₦{item.price}</Text>

              {isSelected && onChangeQty && (
                <View style={styles.qtyControls}>
                  <TouchableOpacity onPress={() => onChangeQty(item.name, -1)} style={styles.qtyBtn}>
                    <Text>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{isSelected.quantity}</Text>
                  <TouchableOpacity onPress={() => onChangeQty(item.name, 1)} style={styles.qtyBtn}>
                    <Text>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function HotelDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, refreshBalance } = useApp();
  const { secureAction, showPinDialog, setShowPinDialog, verifyPin } = useSecureAction();

  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roomCount, setRoomCount] = useState(1);
  const [extras, setExtras] = useState<SelectableItem[]>([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [processing, setProcessing] = useState(false);

  const availableExtras: SelectableItem[] = [
    { name: "Breakfast", price: 2000 },
    { name: "Parking", price: 1000 },
    { name: "Airport Pickup", price: 3000 },
  ];

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        const snap = await getDoc(doc(db, "hotels", id));
        if (snap.exists()) setHotel({ id: snap.id, ...snap.data() });
        else {
          Alert.alert("Error", "Hotel not found");
          router.back();
        }
      } catch {
        Alert.alert("Error", "Failed to load hotel details");
      } finally {
        setLoading(false);
      }
    };
    fetchHotel();
  }, [id]);

  const calculateTotal = () => {
    if (!hotel) return 0;
    const base = hotel.pricePerNight || 0;
    const extrasTotal = extras.reduce((sum, e) => sum + e.price * (e.quantity || 1), 0);
    return roomCount * base + extrasTotal;
  };

  const toggleItem = (item: SelectableItem, list: SelectableItem[], setList: React.Dispatch<React.SetStateAction<SelectableItem[]>>) => {
    const exists = list.find((x) => x.name === item.name);
    if (exists) setList(list.filter((x) => x.name !== item.name));
    else setList([...list, { ...item, quantity: 1 }]);
  };

  const changeItemQty = (name: string, delta: number, list: SelectableItem[], setList: React.Dispatch<React.SetStateAction<SelectableItem[]>>) => {
    setList(list.map((p) => p.name === name ? { ...p, quantity: Math.max(1, (p.quantity || 1) + delta) } : p));
  };

  const handleBooking = async () => {
    if (!user) return Alert.alert("Login Required", "Please sign in.");
    if (!checkIn || !checkOut) return Alert.alert("Missing Dates", "Select check-in and check-out dates.");
    if (!hotel) return;

    const totalPrice = calculateTotal();
    if (balance < totalPrice) return Alert.alert("Insufficient Balance", "Top up your wallet.");

    try {
      setProcessing(true);

      await deductBalance(totalPrice, `Booked ${hotel.name}`, "hotel");
      await addTransaction({
        description: `Booked ${hotel.name}`,
        amount: totalPrice,
        category: "hotel",
        type: "debit",
        status: "pending",
      });

      const bookingRef = await addDoc(collection(db, "bookings"), {
        hotelId: hotel.id,
        hotelName: hotel.name,
        buyerId: user.uid,
        buyerName: userProfile?.fullName || "Anonymous",
        roomCount,
        extras,
        checkIn,
        checkOut,
        totalPrice,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      await refreshBalance();
      Alert.alert(
        "Booking Successful",
        `Booking #${bookingRef.id}\n\nTotal: ₦${totalPrice.toLocaleString()}`
      );
      router.push({
        pathname: "/services/hotels/invoice",
        params: { bookingId: bookingRef.id },
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not complete booking. Try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleBookingSecure = () => secureAction(() => handleBooking());

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );

  if (!hotel) return null;

  const total = calculateTotal();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 50 }}>
        <Card style={styles.card}>
          {hotel.thumbnail ? (
            <Image source={{ uri: hotel.thumbnail }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={{ color: "#fff", fontSize: 28 }}>🏨</Text>
            </View>
          )}
          <Card.Content>
            <Text style={styles.name}>{hotel.name}</Text>
            <Text style={styles.desc}>{hotel.description}</Text>
            <Text style={styles.price}>₦{hotel.pricePerNight?.toLocaleString()} / night</Text>
          </Card.Content>
        </Card>

        {/* Rooms */}
        <View style={styles.section}>
          <Text style={styles.label}>Number of Rooms</Text>
          <View style={styles.row}>
            <Button mode="outlined" onPress={() => setRoomCount(Math.max(1, roomCount - 1))}>-</Button>
            <Text style={{ marginHorizontal: 10, fontSize: 18 }}>{roomCount}</Text>
            <Button mode="outlined" onPress={() => setRoomCount(roomCount + 1)}>+</Button>
          </View>
        </View>

        {/* Extras */}
        <ItemCategory
          title="Extras"
          items={availableExtras}
          selected={extras}
          onToggle={(item) => toggleItem(item, extras, setExtras)}
          onChangeQty={(name, delta) => changeItemQty(name, delta, extras, setExtras)}
        />

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.label}>Check-In Date</Text>
          <TextInput
            mode="outlined"
            placeholder="YYYY-MM-DD"
            value={checkIn}
            onChangeText={setCheckIn}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Check-Out Date</Text>
          <TextInput
            mode="outlined"
            placeholder="YYYY-MM-DD"
            value={checkOut}
            onChangeText={setCheckOut}
          />
        </View>

        {/* Checkout */}
        <Button mode="contained" loading={processing} disabled={processing} onPress={handleBookingSecure} style={styles.checkoutBtn}>
          Pay ₦{total.toLocaleString()}
        </Button>

        <PinDialog visible={showPinDialog} onClose={() => setShowPinDialog(false)} onSubmit={verifyPin} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { marginBottom: 16 },
  image: { width: "100%", height: 200, borderRadius: 8 },
  placeholder: { backgroundColor: PRIMARY_COLOR, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 22, fontWeight: "700", marginTop: 8 },
  desc: { color: "#666", marginVertical: 6 },
  price: { fontWeight: "bold", fontSize: 18, color: PRIMARY_COLOR },
  section: { marginVertical: 10 },
  label: { fontWeight: "600", marginBottom: 8, fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  flexWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  itemCard: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10, width: "47%", backgroundColor: "#fff" },
  itemSelected: { borderColor: PRIMARY_COLOR, backgroundColor: "#EDE7F6" },
  itemText: { fontWeight: "600", fontSize: 14 },
  itemPrice: { fontSize: 13, color: "#666", marginTop: 4 },
  qtyControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  qtyBtn: { borderWidth: 1, borderColor: "#ccc", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  qtyText: { fontSize: 15, fontWeight: "600", marginHorizontal: 6 },
  checkoutBtn: { marginTop: 20, backgroundColor: PRIMARY_COLOR },
});
