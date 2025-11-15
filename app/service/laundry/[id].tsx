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
import {
  ActivityIndicator,
  Button,
  Card,
  Text,
} from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { useSecureAction } from "../../../hooks/useSecureAction";
import { db } from "../../../lib/firebase";
import PinDialog from "../../components/security/PinDialog";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

type LaundryItem = {
  name: string;
  price: number;
  quantity?: number;
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
    { name: "Duvet", price: 1000 },
    { name: "Shirt", price: 500 },
    { name: "Trouser", price: 500 },
    { name: "Kaftan", price: 1000 },
    { name: "Babban Riga", price: 300 },
  ];

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const snap = await getDoc(doc(db, "services", id));
        if (snap.exists()) setShop({ id: snap.id, ...snap.data() });
        else {
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

  const handleCheckout = async () => {
    if (!user) return Alert.alert("Login Required", "Please sign in.");
    if (!address.trim())
      return Alert.alert("Missing Address", "Enter your pickup/delivery address.");
    if (selectedItems.length === 0)
      return Alert.alert("No Items", "Select at least one laundry item.");

    const totalPrice = calculateTotal();
    if (balance < totalPrice)
      return Alert.alert("Insufficient Balance", "Top up your wallet.");

    try {
      setProcessing(true);
      await deductBalance(totalPrice, `Laundry at ${shop?.name}`, "laundry");
      await addTransaction({
        description: `Laundry order from ${shop?.name}`,
        amount: totalPrice,
        category: "laundry",
        type: "debit",
        status: "pending",
      });

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

      await refreshBalance();
      Alert.alert(
        "Laundry Order Successful",
        `Invoice #${orderRef.id}\n\nTotal: ₦${totalPrice.toLocaleString()}`
      );
      router.push({
        pathname: "/service/laundry/invoice",
        params: { orderId: orderRef.id },
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not place order. Try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckoutSecure = () => secureAction(() => handleCheckout());

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );

  if (!shop) return null;

  const total = calculateTotal();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <Card style={styles.card}>
          {shop.thumbnail ? (
            <Image source={{ uri: shop.thumbnail }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={{ color: "#fff", fontSize: 28 }}>🧺</Text>
            </View>
          )}
          <Card.Content>
            <Text style={styles.name}>{shop.name}</Text>
            <Text style={styles.desc}>{shop.description}</Text>
          </Card.Content>
        </Card>

        {/* Laundry List */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Laundry Items</Text>
          <View style={styles.flexWrap}>
            {availableLaundry.map((item) => {
              const selected = selectedItems.find((x) => x.name === item.name);
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.itemCard,
                    selected && styles.itemSelected,
                  ]}
                  onPress={() => toggleItem(item)}
                >
                  <Text style={styles.itemText}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₦{item.price}</Text>
                  {selected && (
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        onPress={() => changeQty(item.name, -1)}
                        style={styles.qtyBtn}
                      >
                        <Text>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{selected.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => changeQty(item.name, 1)}
                        style={styles.qtyBtn}
                      >
                        <Text>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.label}>Pickup / Delivery Address</Text>
          <Button
            mode="outlined"
            onPress={() => Alert.alert("Enter Address", "Feature Coming Soon")}
          >
            Set Address
          </Button>
        </View>

        {/* Checkout */}
        <Button
          mode="contained"
          loading={processing}
          disabled={processing}
          onPress={handleCheckoutSecure}
          style={styles.checkoutBtn}
        >
          Pay ₦{total.toLocaleString()}
        </Button>

        <PinDialog
          visible={showPinDialog}
          onClose={() => setShowPinDialog(false)}
          onSubmit={verifyPin}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { marginBottom: 16 },
  image: { width: "100%", height: 200, borderRadius: 8 },
  placeholder: {
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 22, fontWeight: "700", marginTop: 8 },
  desc: { color: "#666", marginVertical: 6 },
  section: { marginVertical: 10 },
  label: { fontWeight: "600", marginBottom: 8, fontSize: 16 },
  flexWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  itemCard: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    width: "47%",
    backgroundColor: "#fff",
  },
  itemSelected: { borderColor: PRIMARY_COLOR, backgroundColor: "#EDE7F6" },
  itemText: { fontWeight: "600", fontSize: 14 },
  itemPrice: { fontSize: 13, color: "#666", marginTop: 4 },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  qtyBtn: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qtyText: { fontSize: 15, fontWeight: "600", marginHorizontal: 6 },
  checkoutBtn: { marginTop: 20, backgroundColor: PRIMARY_COLOR },
});
