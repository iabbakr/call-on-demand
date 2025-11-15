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

export default function ShopDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, refreshBalance } =
    useApp();
  const { secureAction, showPinDialog, setShowPinDialog, verifyPin } = useSecureAction();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const snap = await getDoc(doc(db, "services", id));
        if (snap.exists()) setProduct({ id: snap.id, ...snap.data() });
        else {
          Alert.alert("Error", "Product not found");
          router.back();
        }
      } catch (err) {
        Alert.alert("Error", "Failed to load product details");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const calculateTotal = () => {
    if (!product) return 0;
    return (product.price || 0) * quantity;
  };

  const handleCheckout = async () => {
    if (!user) return Alert.alert("Login Required", "Please sign in.");
    if (!address.trim())
      return Alert.alert("Missing Address", "Enter your delivery address.");
    if (!product) return;

    const totalPrice = calculateTotal();
    if (balance < totalPrice)
      return Alert.alert("Insufficient Balance", "Top up your wallet.");

    try {
      setProcessing(true);

      await deductBalance(totalPrice, `Purchased ${product.name}`, "shop");
      await addTransaction({
        description: `Purchased ${product.name}`,
        amount: totalPrice,
        category: "shop",
        type: "debit",
        status: "pending",
      });

      const orderRef = await addDoc(collection(db, "orders"), {
        productId: product.id,
        buyerId: user.uid,
        buyerName: userProfile?.fullName || "Anonymous",
        productName: product.name,
        quantity,
        address,
        totalPrice,
        status: "pending",
        category: "shop",
        createdAt: serverTimestamp(),
      });

      await refreshBalance();
      Alert.alert(
        "Purchase Successful",
        `Order #${orderRef.id}\n\nTotal: ₦${totalPrice.toLocaleString()}`
      );
      router.push({
        pathname: "./shop/invoice",
        params: { orderId: orderRef.id },
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not complete purchase. Try again.");
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

  if (!product) return null;

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
          {product.thumbnail ? (
            <Image source={{ uri: product.thumbnail }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={{ color: "#fff", fontSize: 28 }}>🛍️</Text>
            </View>
          )}
          <Card.Content>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.desc}>{product.description}</Text>
            <Text style={styles.price}>₦{product.price?.toLocaleString()}</Text>
          </Card.Content>
        </Card>

        {/* Quantity */}
        <View style={styles.section}>
          <Text style={styles.label}>Quantity</Text>
          <View style={styles.row}>
            <Button
              mode="outlined"
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              -
            </Button>
            <Text style={{ marginHorizontal: 10, fontSize: 18 }}>{quantity}</Text>
            <Button mode="outlined" onPress={() => setQuantity(quantity + 1)}>
              +
            </Button>
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.label}>Delivery Address</Text>
          <TextInput
            mode="outlined"
            placeholder="Enter full address"
            value={address}
            onChangeText={setAddress}
            multiline
          />
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
  price: { fontWeight: "bold", fontSize: 18, color: PRIMARY_COLOR },
  section: { marginVertical: 10 },
  label: { fontWeight: "600", marginBottom: 8, fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  checkoutBtn: { marginTop: 20, backgroundColor: PRIMARY_COLOR },
});
