// laundry/[id].tsx - Improved Laundry Details & Booking
import { FontAwesome5 } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
  TextInput,
} from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { useSecureAction } from "../../../hooks/useSecureAction";
import { db } from "../../../lib/firebase";
import PinDialog from "../../components/security/PinDialog";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const SCREEN_BG = "#F5F5F5";

const { width } = Dimensions.get("window");

type LaundryItem = {
  name: string;
  price: number;
  quantity?: number;
  icon: string;
};

export default function LaundryDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    userProfile,
    balance,
    deductBalance,
    addTransaction,
    refreshBalance,
  } = useApp();
  const { secureAction, showPinDialog, setShowPinDialog, verifyPin } =
    useSecureAction();

  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [address, setAddress] = useState("");
  const [selectedItems, setSelectedItems] = useState<LaundryItem[]>([]);

  const availableLaundry: LaundryItem[] = [
    { name: "Shirt", price: 500, icon: "👕" },
    { name: "Trouser", price: 500, icon: "👖" },
    { name: "Dress", price: 800, icon: "👗" },
    { name: "Suit", price: 1500, icon: "🤵" },
    { name: "Duvet", price: 1000, icon: "🛏️" },
    { name: "Kaftan", price: 1000, icon: "👘" },
    { name: "Babban Riga", price: 300, icon: "🧥" },
    { name: "Bedsheet", price: 600, icon: "🛌" },
  ];

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const snap = await getDoc(doc(db, "services", id));
        if (snap.exists()) {
          setShop({ id: snap.id, ...snap.data() });
        } else {
          Alert.alert("Error", "Laundry shop not found");
          router.back();
        }
      } catch {
        Alert.alert("Error", "Failed to load shop details");
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [id]);

  const toggleItem = (item: LaundryItem) => {
    const exists = selectedItems.find((x) => x.name === item.name);
    if (exists) {
      setSelectedItems(selectedItems.filter((x) => x.name !== item.name));
    } else {
      setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
    }
  };

  const changeQty = (name: string, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.name === name
          ? { ...i, quantity: Math.max(1, (i.quantity || 1) + delta) }
          : i
      )
    );
  };

  const calculateTotal = () =>
    selectedItems.reduce(
      (sum, i) => sum + i.price * (i.quantity || 1),
      0
    );

  const createTransaction = async (totalPrice: number, orderId: string) => {
    if (!user || !shop) return null;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.exists() ? userSnap.data()?.fullName || "You" : "You";

      const transactionData = {
        senderId: user.uid,
        senderName: userName,
        receiverId: null,
        receiverName: shop.name,
        amount: totalPrice,
        type: "Laundry Service",
        category: "Laundry",
        status: "success",
        description: `Laundry order from ${shop.name}`,
        reference: `LAUNDRY-${Date.now()}`,
        createdAt: serverTimestamp(),
        metadata: {
          shopId: shop.id,
          shopName: shop.name,
          orderId,
          items: selectedItems.map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
          address,
        },
      };

      const docRef = await addDoc(collection(db, "transactions"), transactionData);
      return docRef.id;
    } catch (error) {
      console.error("Error creating transaction:", error);
      return null;
    }
  };

  const handleCheckout = async () => {
    if (!user) return Alert.alert("Login Required", "Please sign in.");
    if (!address.trim())
      return Alert.alert("Missing Address", "Enter your pickup/delivery address.");
    if (selectedItems.length === 0)
      return Alert.alert("No Items", "Select at least one laundry item.");

    const totalPrice = calculateTotal();
    if (balance < totalPrice)
      return Alert.alert("Insufficient Balance", "Top up your wallet to continue.");

    try {
      setProcessing(true);

      // Create order first
      const orderRef = await addDoc(collection(db, "laundry_orders"), {
        shopId: shop.id,
        buyerId: user.uid,
        buyerName: userProfile?.fullName || "Anonymous",
        shopName: shop.name,
        items: selectedItems,
        address,
        totalPrice,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Deduct balance
      await deductBalance(totalPrice, `Laundry at ${shop?.name}`, "Laundry");

      // Create transaction record
      const transactionId = await createTransaction(totalPrice, orderRef.id);

      // Add to app transactions
      await addTransaction({
        description: `Laundry order from ${shop?.name}`,
        amount: totalPrice,
        category: "Laundry",
        type: "debit",
        status: "success",
      });

      await refreshBalance();

      Alert.alert(
        "🎉 Order Placed Successfully!",
        `Your laundry order has been confirmed.\n\nOrder ID: ${orderRef.id.slice(0, 8).toUpperCase()}\nTotal: ₦${totalPrice.toLocaleString()}`,
        [
          {
            text: "View Receipt",
            onPress: () => {
              if (transactionId) {
                router.push({
                  pathname: "/components/trans/Transaction-Receipt",
                  params: { id: transactionId },
                });
              }
            },
          },
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not place order. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckoutSecure = () => secureAction(() => handleCheckout());

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading shop details...</Text>
      </View>
    );
  }

  if (!shop) return null;

  const total = calculateTotal();
  const canCheckout = address.trim() && selectedItems.length > 0 && total <= balance;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: shop.name || "Laundry Details",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerBackVisible: true,
        }}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {shop.thumbnail ? (
            <Image source={{ uri: shop.thumbnail }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <FontAwesome5 name="tshirt" size={64} color="#FFF" />
            </View>
          )}

          {shop.rating && (
            <View style={styles.ratingBadge}>
              <FontAwesome5 name="star" size={16} color="#FFB800" solid />
              <Text style={styles.ratingText}>{shop.rating}</Text>
            </View>
          )}
        </View>

        {/* Shop Info */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.shopName}>{shop.name}</Text>

            <View style={styles.locationRow}>
              <FontAwesome5 name="map-marker-alt" size={14} color="#666" />
              <Text style={styles.locationText}>
                {shop.city}, {shop.state}
              </Text>
            </View>

            {shop.description && (
              <Text style={styles.description}>{shop.description}</Text>
            )}

            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Starting from</Text>
              <Text style={styles.priceValue}>₦{shop.price?.toLocaleString()}/item</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Laundry Items Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="list" size={18} color={PRIMARY_COLOR} />
              <Text style={styles.sectionTitle}>Select Laundry Items</Text>
            </View>

            <View style={styles.itemsGrid}>
              {availableLaundry.map((item) => {
                const selected = selectedItems.find((x) => x.name === item.name);
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.itemCard,
                      selected && styles.itemCardSelected,
                    ]}
                    onPress={() => toggleItem(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemHeader}>
                      <View style={[
                        styles.itemIconContainer,
                        selected && styles.itemIconContainerSelected
                      ]}>
                        <Text style={styles.itemIcon}>{item.icon}</Text>
                      </View>
                      {selected && (
                        <View style={styles.selectedBadge}>
                          <FontAwesome5 name="check" size={10} color="#FFF" />
                        </View>
                      )}
                    </View>

                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemPrice}>₦{item.price.toLocaleString()}</Text>

                    {selected && (
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          onPress={() => changeQty(item.name, -1)}
                          style={styles.qtyButton}
                        >
                          <FontAwesome5 name="minus" size={12} color={PRIMARY_COLOR} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{selected.quantity || 1}</Text>
                        <TouchableOpacity
                          onPress={() => changeQty(item.name, 1)}
                          style={styles.qtyButton}
                        >
                          <FontAwesome5 name="plus" size={12} color={PRIMARY_COLOR} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Address Section */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="home" size={18} color={PRIMARY_COLOR} />
              <Text style={styles.sectionTitle}>Pickup / Delivery Address</Text>
            </View>

            <TextInput
              mode="outlined"
              placeholder="Enter your full address"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              style={styles.addressInput}
              left={<TextInput.Icon icon="map-marker" />}
            />

            {!address && (
              <Text style={styles.helperText}>
                Include street, landmark, and area for accurate pickup
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Order Summary */}
        {selectedItems.length > 0 && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.summaryTitle}>Order Summary</Text>

              {selectedItems.map((item, index) => (
                <View key={item.name} style={styles.summaryRow}>
                  <View style={styles.summaryItemInfo}>
                    <Text style={styles.summaryItemIcon}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryItemName}>{item.name}</Text>
                      <Text style={styles.summaryItemQty}>Quantity: {item.quantity || 1}</Text>
                    </View>
                  </View>
                  <Text style={styles.summaryValue}>
                    ₦{(item.price * (item.quantity || 1)).toLocaleString()}
                  </Text>
                </View>
              ))}

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₦{total.toLocaleString()}</Text>
              </View>

              <View style={styles.balanceInfo}>
                <FontAwesome5 name="wallet" size={14} color="#666" />
                <Text style={styles.balanceText}>
                  Wallet: ₦{balance.toLocaleString()}
                </Text>
                {total > balance && (
                  <Chip
                    compact
                    style={styles.insufficientChip}
                    textStyle={styles.insufficientText}
                  >
                    Insufficient
                  </Chip>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomLabel}>Total</Text>
          <Text style={styles.bottomValue}>₦{total.toLocaleString()}</Text>
        </View>

        <Button
          mode="contained"
          onPress={handleCheckoutSecure}
          disabled={!canCheckout || processing}
          loading={processing}
          style={styles.checkoutButton}
          contentStyle={styles.checkoutContent}
          labelStyle={styles.checkoutLabel}
          icon="check-circle"
        >
          {processing ? "Processing..." : "Place Order"}
        </Button>
      </View>

      <PinDialog
        visible={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onSubmit={verifyPin}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SCREEN_BG,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Hero Section
  heroContainer: {
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 280,
  },
  heroPlaceholder: {
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  ratingBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },

  // Info Card
  infoCard: {
    margin: 16,
    marginTop: -32,
    borderRadius: 16,
    elevation: 4,
  },
  shopName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  priceCard: {
    backgroundColor: ACCENT_COLOR,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    color: "#666",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },

  // Cards
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  // Items Grid
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  itemCard: {
    width: (width - 20) / 4,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  itemCardSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: ACCENT_COLOR,
  },
  itemHeader: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  itemIconContainerSelected: {
    backgroundColor: PRIMARY_COLOR + "20",
  },
  itemIcon: {
    fontSize: 32,
  },
  selectedBadge: {
    position: "absolute",
    top: 0,
    right: 40,
    backgroundColor: SUCCESS_COLOR,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  itemPrice: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: "600",
    marginBottom: 8,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BACKGROUND_COLOR,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    minWidth: 24,
    textAlign: "center",
  },

  // Address
  addressInput: {
    backgroundColor: BACKGROUND_COLOR,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },

  // Summary
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  summaryItemIcon: {
    fontSize: 24,
  },
  summaryItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  summaryItemQty: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  balanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  balanceText: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  insufficientChip: {
    backgroundColor: ERROR_COLOR + "20",
    height: 24,
  },
  insufficientText: {
    fontSize: 11,
    color: ERROR_COLOR,
    fontWeight: "600",
  },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BACKGROUND_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomPrice: {
    flex: 1,
  },
  bottomLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  bottomValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  checkoutButton: {
    borderRadius: 12,
    elevation: 0,
  },
  checkoutContent: {
    paddingVertical: 4,
  },
  checkoutLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});