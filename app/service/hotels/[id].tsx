// hotels/[id].tsx - Hotel Details & Booking with Room Types
import { FontAwesome5 } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
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
const ACCENT_COLOR = "#E8DEF8";
const ERROR_COLOR = "#F44336";
const SUCCESS_COLOR = "#4CAF50";
const SCREEN_BG = "#F5F5F5";
const { width } = Dimensions.get("window");

type SelectableItem = { name: string; price: number };

export default function HotelDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, refreshBalance } = useApp();
  const { secureAction, showPinDialog, setShowPinDialog, verifyPin } = useSecureAction();

  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roomCount, setRoomCount] = useState(1);
  const [selectedRoomType, setSelectedRoomType] = useState<SelectableItem | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        const snap = await getDoc(doc(db, "services", id));
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

  const roomTypes: SelectableItem[] = hotel
    ? (hotel.roomTypes || []).map((rt: any) => ({
        name: rt.type,
        price: rt.price,
      }))
    : [];

  const calculateTotal = () => selectedRoomType ? selectedRoomType.price * roomCount : 0;

  const createTransaction = async (totalPrice: number, bookingId: string) => {
    if (!user || !hotel) return null;
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userName = userSnap.exists() ? userSnap.data()?.fullName || "You" : "You";

      const transactionData = {
        senderId: user.uid,
        senderName: userName,
        receiverId: null,
        receiverName: hotel.name,
        amount: totalPrice,
        type: "Hotel Booking",
        category: "Hotel",
        status: "success",
        description: `Booked ${hotel.name} - ${roomCount} room(s) (${selectedRoomType?.name})`,
        reference: `HOTEL-${Date.now()}`,
        createdAt: serverTimestamp(),
        metadata: {
          hotelId: hotel.id,
          hotelName: hotel.name,
          bookingId,
          roomCount,
          roomType: selectedRoomType?.name,
          checkIn,
          checkOut,
        },
      };

      const docRef = await addDoc(collection(db, "transactions"), transactionData);
      return docRef.id;
    } catch (error) {
      console.error("Error creating transaction:", error);
      return null;
    }
  };

  const handleBooking = async () => {
    if (!user) return Alert.alert("Login Required", "Please sign in.");
    if (!checkIn || !checkOut) return Alert.alert("Missing Dates", "Select check-in and check-out dates.");
    if (!selectedRoomType) return Alert.alert("Select Room Type", "Please select a room type.");
    if (!hotel) return;

    const totalPrice = calculateTotal();
    if (balance < totalPrice) return Alert.alert("Insufficient Balance", "Top up your wallet to continue.");

    try {
      setProcessing(true);
      const bookingRef = await addDoc(collection(db, "bookings"), {
        hotelId: hotel.id,
        hotelName: hotel.name,
        buyerId: user.uid,
        buyerName: userProfile?.fullName || "Anonymous",
        roomCount,
        roomType: selectedRoomType.name,
        checkIn,
        checkOut,
        totalPrice,
        status: "confirmed",
        createdAt: serverTimestamp(),
      });

      await deductBalance(totalPrice, `Booked ${hotel.name}`, "Hotel");
      const transactionId = await createTransaction(totalPrice, bookingRef.id);

      await addTransaction({
        description: `Booked ${hotel.name} - ${roomCount} room(s) (${selectedRoomType.name})`,
        amount: totalPrice,
        category: "Hotel",
        type: "debit",
        status: "success",
      });

      await refreshBalance();

      Alert.alert(
        "🎉 Booking Successful!",
        `Your booking has been confirmed.\n\nBooking ID: ${bookingRef.id.slice(0, 8).toUpperCase()}\nTotal: ₦${totalPrice.toLocaleString()}`,
        [
          {
            text: "View Receipt",
            onPress: () =>
              transactionId &&
              router.push({
                pathname: "/components/trans/Transaction-Receipt",
                params: { id: transactionId },
              }),
          },
          { text: "Done", onPress: () => router.back() },
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not complete booking. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleBookingSecure = () => secureAction(() => handleBooking());

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading hotel details...</Text>
      </View>
    );

  if (!hotel) return null;

  const total = calculateTotal();
  const canBook = checkIn && checkOut && roomCount > 0 && selectedRoomType && total <= balance;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: hotel.name || "Hotel Details",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerBackVisible: true,
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroContainer}>
          {hotel.thumbnail ? (
            <Image source={{ uri: hotel.thumbnail }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <FontAwesome5 name="hotel" size={64} color="#FFF" />
            </View>
          )}
          {hotel.rating && (
            <View style={styles.ratingBadge}>
              <FontAwesome5 name="star" size={16} color="#FFB800" solid />
              <Text style={styles.ratingText}>{hotel.rating}</Text>
            </View>
          )}
        </View>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.hotelName}>{hotel.name}</Text>
            <View style={styles.locationRow}>
              <FontAwesome5 name="map-marker-alt" size={14} color="#666" />
              <Text style={styles.locationText}>{hotel.city}, {hotel.state}</Text>
            </View>
            {hotel.description && <Text style={styles.description}>{hotel.description}</Text>}
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Base Price per night</Text>
              <Text style={styles.priceValue}>₦{hotel.price?.toLocaleString()}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Select Room Type</Text>
            <View style={styles.itemsGrid}>
              {roomTypes.map((room) => {
                const isSelected = selectedRoomType?.name === room.name;
                return (
                  <TouchableOpacity
                    key={room.name}
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    onPress={() => setSelectedRoomType(room)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemIcon}>🏨</Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <FontAwesome5 name="check" size={10} color="#FFF" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemName}>{room.name}</Text>
                    <Text style={styles.itemPrice}>₦{room.price.toLocaleString()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Number of Rooms</Text>
            <View style={styles.roomSelector}>
              <TouchableOpacity onPress={() => setRoomCount(Math.max(1, roomCount - 1))} style={styles.roomButton}>
                <FontAwesome5 name="minus" size={16} color={PRIMARY_COLOR} />
              </TouchableOpacity>
              <View style={styles.roomCountContainer}>
                <FontAwesome5 name="bed" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.roomCount}>{roomCount}</Text>
              </View>
              <TouchableOpacity onPress={() => setRoomCount(roomCount + 1)} style={styles.roomButton}>
                <FontAwesome5 name="plus" size={16} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Check-in & Check-out Dates</Text>
            <View style={styles.dateInputContainer}>
              <View style={styles.dateInputWrapper}>
                <Text style={styles.dateLabel}>Check-in</Text>
                <TextInput mode="outlined" placeholder="YYYY-MM-DD" value={checkIn} onChangeText={setCheckIn} style={styles.dateInput} left={<TextInput.Icon icon="calendar" />} />
              </View>
              <FontAwesome5 name="arrow-right" size={16} color="#666" style={{ marginTop: 30, marginHorizontal: 8 }} />
              <View style={styles.dateInputWrapper}>
                <Text style={styles.dateLabel}>Check-out</Text>
                <TextInput mode="outlined" placeholder="YYYY-MM-DD" value={checkOut} onChangeText={setCheckOut} style={styles.dateInput} left={<TextInput.Icon icon="calendar" />} />
              </View>
            </View>
          </Card.Content>
        </Card>

        {selectedRoomType && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.summaryTitle}>Booking Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{selectedRoomType.name} × {roomCount}</Text>
                <Text style={styles.summaryValue}>₦{(selectedRoomType.price * roomCount).toLocaleString()}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₦{total.toLocaleString()}</Text>
              </View>
              <View style={styles.balanceInfo}>
                <FontAwesome5 name="wallet" size={14} color="#666" />
                <Text style={styles.balanceText}>Wallet: ₦{balance.toLocaleString()}</Text>
                {total > balance && <Text style={{ color: ERROR_COLOR, fontWeight: "600" }}>Insufficient</Text>}
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomLabel}>Total</Text>
          <Text style={styles.bottomValue}>₦{total.toLocaleString()}</Text>
        </View>
        <Button
          mode="contained"
          onPress={handleBookingSecure}
          disabled={!canBook || processing}
          loading={processing}
          style={styles.bookNowButton}
          contentStyle={styles.bookNowContent}
          labelStyle={styles.bookNowLabel}
          icon="check-circle"
        >
          {processing ? "Processing..." : "Confirm Booking"}
        </Button>
      </View>

      <PinDialog visible={showPinDialog} onClose={() => setShowPinDialog(false)} onSubmit={verifyPin} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  scrollContent: { paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: SCREEN_BG },
  loadingText: { marginTop: 12, color: "#666", fontSize: 14 },
  heroContainer: { position: "relative" },
  heroImage: { width: "100%", height: 280 },
  heroPlaceholder: { backgroundColor: PRIMARY_COLOR, justifyContent: "center", alignItems: "center" },
  ratingBadge: { position: "absolute", top: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  ratingText: { fontSize: 15, fontWeight: "700", color: "#333" },
  infoCard: { margin: 16, marginTop: -32, borderRadius: 16, elevation: 4 },
  hotelName: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  locationText: { color: "#666", fontSize: 14 },
  description: { marginBottom: 12, color: "#444", fontSize: 14 },
  priceCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  priceLabel: { fontSize: 14, color: "#666" },
  priceValue: { fontSize: 18, fontWeight: "700", color: PRIMARY_COLOR },
  card: { marginHorizontal: 16, marginVertical: 8, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  itemsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  itemCard: { width: (width - 40) / 3, backgroundColor: "#FFF", borderRadius: 12, padding: 12, alignItems: "center", marginBottom: 12 },
  itemCardSelected: { borderWidth: 2, borderColor: PRIMARY_COLOR },
  itemHeader: { position: "relative", marginBottom: 8 },
  itemIcon: { fontSize: 24 },
  selectedBadge: { position: "absolute", top: -6, right: -6, backgroundColor: PRIMARY_COLOR, borderRadius: 10, padding: 2 },
  itemName: { fontSize: 14, fontWeight: "600" },
  itemPrice: { fontSize: 13, fontWeight: "500", color: "#666" },
  roomSelector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  roomButton: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: PRIMARY_COLOR },
  roomCountContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  roomCount: { fontSize: 16, fontWeight: "700" },
  dateInputContainer: { flexDirection: "row", alignItems: "center" },
  dateInputWrapper: { flex: 1 },
  dateLabel: { fontSize: 12, fontWeight: "600", color: "#333", marginBottom: 4 },
  dateInput: { backgroundColor: "#FFF", marginBottom: 12 },
  summaryCard: { marginHorizontal: 16, marginVertical: 8, borderRadius: 12 },
  summaryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#CCC", marginVertical: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { fontSize: 16, fontWeight: "700" },
  totalValue: { fontSize: 16, fontWeight: "700", color: PRIMARY_COLOR },
  balanceInfo: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },

  balanceText: { fontSize: 14, color: "#666" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#EEE" },
  bottomPrice: {},
  bottomLabel: { fontSize: 14, color: "#666" },
  bottomValue: { fontSize: 18, fontWeight: "700", color: PRIMARY_COLOR },
  bookNowButton: { flex: 1, marginLeft: 16, borderRadius: 12 },
  bookNowContent: { paddingVertical: 10 },
  bookNowLabel: { fontSize: 14, fontWeight: "700" },
});
