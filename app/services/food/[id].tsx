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
  TextInput
} from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

export default function FoodDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, refreshBalance } = useApp();

  const [food, setFood] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portionCount, setPortionCount] = useState(1);
  const [proteins, setProteins] = useState<any[]>([]);
  const [soups, setSoups] = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  const [address, setAddress] = useState("");
  const [processing, setProcessing] = useState(false);

  const availableProteins = [
    { name: "Chicken", price: 1000 },
    { name: "Beef", price: 800 },
    { name: "Fish", price: 900 },
    { name: "Goat Meat", price: 1200 },
  ];

  const availableSoups = [
    { name: "Egusi", price: 700 },
    { name: "Vegetable", price: 600 },
    { name: "Okro", price: 500 },
    { name: "Kuka", price: 400 },
  ];

  const availableExtras = [
    { name: "Plantain", price: 500 },
    { name: "Egg", price: 300 },
    { name: "Water", price: 200 },
    { name: "Coleslaw", price: 400 },
  ];

  useEffect(() => {
    const fetchFood = async () => {
      try {
        const snap = await getDoc(doc(db, "services", id));
        if (snap.exists()) setFood({ id: snap.id, ...snap.data() });
        else {
          Alert.alert("Error", "Food not found");
          router.back();
        }
      } catch {
        Alert.alert("Error", "Failed to load food details");
      } finally {
        setLoading(false);
      }
    };
    fetchFood();
  }, [id]);

  const calculateTotal = () => {
    if (!food) return 0;
    const base = food.price || 0;
    const portionPrice = portionCount * 1000;
    const proteinTotal = proteins.reduce(
      (sum, p) => sum + p.price * (p.quantity || 1),
      0
    );
    const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0);
    const soupsTotal = soups.reduce((sum, s) => sum + s.price, 0);
    return base + portionPrice + proteinTotal + extrasTotal + soupsTotal;
  };

  const toggleProtein = (protein: any) => {
    const exists = proteins.find((p) => p.name === protein.name);
    if (exists) {
      setProteins(proteins.filter((p) => p.name !== protein.name));
    } else {
      setProteins([...proteins, { ...protein, quantity: 1 }]);
    }
  };

  const changeProteinQty = (name: string, delta: number) => {
    setProteins((prev) =>
      prev.map((p) =>
        p.name === name
          ? { ...p, quantity: Math.max(1, p.quantity + delta) }
          : p
      )
    );
  };

  const toggleSoup = (soup: any) => {
    if (soups.find((s) => s.name === soup.name)) {
      setSoups(soups.filter((s) => s.name !== soup.name));
    } else {
      setSoups([...soups, soup]);
    }
  };

  const toggleExtra = (extra: any) => {
    const exists = extras.find((e) => e.name === extra.name);
    if (exists) {
      setExtras(extras.filter((e) => e.name !== extra.name));
    } else {
      setExtras([...extras, extra]);
    }
  };

  const handleCheckout = async () => {
    if (!user) return Alert.alert("Login Required", "Please sign in.");
    if (!address.trim())
      return Alert.alert("Missing Address", "Enter your delivery address.");
    if (!food) return;

    const totalPrice = calculateTotal();
    if (balance < totalPrice)
      return Alert.alert("Insufficient Balance", "Top up your wallet.");

    try {
      setProcessing(true);
      await deductBalance(totalPrice, `Ordered ${food.name}`, "food");
      await addTransaction({
        description: `Ordered ${food.name}`,
        amount: totalPrice,
        category: "food",
        type: "debit",
        status: "pending",
      });

      const orderRef = await addDoc(collection(db, "orders"), {
        foodId: food.id,
        buyerId: user.uid,
        buyerName: userProfile?.fullName || "Anonymous",
        foodName: food.name,
        portionCount,
        proteins,
        soups,
        extras,
        address,
        totalPrice,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      await refreshBalance();
      Alert.alert(
        "Order Successful",
        `Invoice #${orderRef.id}\n\nTotal: ₦${totalPrice.toLocaleString()}`
      );

      router.push({
        pathname: "/services/food/invoice",
        params: { orderId: orderRef.id },
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not place order. Try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );

  if (!food) return null;

  const total = calculateTotal();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        {food.thumbnail ? (
          <Image source={{ uri: food.thumbnail }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={{ color: "#fff", fontSize: 28 }}>🍲</Text>
          </View>
        )}
        <Card.Content>
          <Text style={styles.name}>{food.name}</Text>
          <Text style={styles.desc}>{food.description}</Text>
          <Text style={styles.price}>₦{food.price?.toLocaleString()}</Text>
        </Card.Content>
      </Card>

      {/* Portion */}
      <View style={styles.section}>
        <Text style={styles.label}>Select Portion (₦1000 each)</Text>
        <View style={styles.row}>
          <Button mode="outlined" onPress={() => setPortionCount(Math.max(1, portionCount - 1))}>-</Button>
          <Text style={{ marginHorizontal: 10, fontSize: 18 }}>{portionCount}</Text>
          <Button mode="outlined" onPress={() => setPortionCount(portionCount + 1)}>+</Button>
        </View>
      </View>

      {/* Proteins */}
      <View style={styles.section}>
        <Text style={styles.label}>Select Proteins</Text>
        <View style={styles.flexWrap}>
          {availableProteins.map((p) => {
            const selected = proteins.find((x) => x.name === p.name);
            return (
              <TouchableOpacity
                key={p.name}
                style={[styles.itemCard, selected && styles.itemSelected]}
                onPress={() => toggleProtein(p)}
              >
                <Text style={styles.itemText}>{p.name}</Text>
                <Text style={styles.itemPrice}>₦{p.price}</Text>
                {selected && (
                  <View style={styles.qtyControls}>
                    <TouchableOpacity onPress={() => changeProteinQty(p.name, -1)} style={styles.qtyBtn}>
                      <Text>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{selected.quantity}</Text>
                    <TouchableOpacity onPress={() => changeProteinQty(p.name, 1)} style={styles.qtyBtn}>
                      <Text>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Soups */}
      <View style={styles.section}>
        <Text style={styles.label}>Soups</Text>
        <View style={styles.flexWrap}>
          {availableSoups.map((s) => (
            <TouchableOpacity
              key={s.name}
              style={[
                styles.itemCard,
                soups.find((x) => x.name === s.name) && styles.itemSelected,
              ]}
              onPress={() => toggleSoup(s)}
            >
              <Text style={styles.itemText}>{s.name}</Text>
              <Text style={styles.itemPrice}>₦{s.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Extras */}
      <View style={styles.section}>
        <Text style={styles.label}>Add Extras</Text>
        <View style={styles.flexWrap}>
          {availableExtras.map((extra) => (
            <TouchableOpacity
              key={extra.name}
              style={[
                styles.itemCard,
                extras.find((x) => x.name === extra.name) && styles.itemSelected,
              ]}
              onPress={() => toggleExtra(extra)}
            >
              <Text style={styles.itemText}>{extra.name}</Text>
              <Text style={styles.itemPrice}>₦{extra.price}</Text>
            </TouchableOpacity>
          ))}
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
        onPress={handleCheckout}
        style={styles.checkoutBtn}
      >
        Checkout & Pay ₦{total.toLocaleString()}
      </Button>
    </ScrollView>
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
  flexWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  itemCard: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    width: "47%",
    backgroundColor: "#fff",
  },
  itemSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: "#EDE7F6",
  },
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
