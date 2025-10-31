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
  TextInput,
} from "react-native-paper";
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

const ItemCategory = ({
  title,
  items,
  selected,
  onToggle,
  onChangeQty,
}: ItemCategoryProps) => {
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

              {/* Quantity controls (show if selected) */}
              {isSelected && onChangeQty && (
                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    onPress={() => onChangeQty(item.name, -1)}
                    style={styles.qtyBtn}
                  >
                    <Text>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{isSelected.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => onChangeQty(item.name, 1)}
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
  );
};

export default function FoodDetails() {
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

  const [food, setFood] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portionCount, setPortionCount] = useState(1);
  const [proteins, setProteins] = useState<SelectableItem[]>([]);
  const [soups, setSoups] = useState<SelectableItem[]>([]);
  const [extras, setExtras] = useState<SelectableItem[]>([]);
  const [address, setAddress] = useState("");
  const [processing, setProcessing] = useState(false);

  const availableProteins: SelectableItem[] = [
    { name: "Chicken", price: 1000 },
    { name: "Beef", price: 800 },
    { name: "Fish", price: 900 },
    { name: "Goat Meat", price: 1200 },
  ];

  const availableSoups: SelectableItem[] = [
    { name: "Egusi", price: 700 },
    { name: "Vegetable", price: 600 },
    { name: "Okro", price: 500 },
    { name: "Kuka", price: 400 },
  ];

  const availableExtras: SelectableItem[] = [
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
    const extrasTotal = extras.reduce(
      (sum, e) => sum + e.price * (e.quantity || 1),
      0
    );
    const soupsTotal = soups.reduce(
      (sum, s) => sum + s.price * (s.quantity || 1),
      0
    );
    return base + portionPrice + proteinTotal + extrasTotal + soupsTotal;
  };

  const toggleItem = (
    item: SelectableItem,
    list: SelectableItem[],
    setList: React.Dispatch<React.SetStateAction<SelectableItem[]>>
  ) => {
    const exists = list.find((x) => x.name === item.name);
    if (exists) setList(list.filter((x) => x.name !== item.name));
    else setList([...list, { ...item, quantity: 1 }]);
  };

  const changeItemQty = (
    name: string,
    delta: number,
    list: SelectableItem[],
    setList: React.Dispatch<React.SetStateAction<SelectableItem[]>>
  ) => {
    setList(
      list.map((p) =>
        p.name === name
          ? { ...p, quantity: Math.max(1, (p.quantity || 1) + delta) }
          : p
      )
    );
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

  const handleCheckoutSecure = () => secureAction(() => handleCheckout());

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
          <Button
            mode="outlined"
            onPress={() => setPortionCount(Math.max(1, portionCount - 1))}
          >
            -
          </Button>
          <Text style={{ marginHorizontal: 10, fontSize: 18 }}>
            {portionCount}
          </Text>
          <Button
            mode="outlined"
            onPress={() => setPortionCount(portionCount + 1)}
          >
            +
          </Button>
        </View>
      </View>

      {/* Categories */}
      <ItemCategory
        title="Select Proteins"
        items={availableProteins}
        selected={proteins}
        onToggle={(item) => toggleItem(item, proteins, setProteins)}
        onChangeQty={(name, delta) =>
          changeItemQty(name, delta, proteins, setProteins)
        }
      />
      <ItemCategory
        title="Soups"
        items={availableSoups}
        selected={soups}
        onToggle={(item) => toggleItem(item, soups, setSoups)}
      />
      <ItemCategory
        title="Add Extras"
        items={availableExtras}
        selected={extras}
        onToggle={(item) => toggleItem(item, extras, setExtras)}
        onChangeQty={(name, delta) =>
          changeItemQty(name, delta, extras, setExtras)
        }
      />

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
        Checkout & Pay ₦{total.toLocaleString()}
      </Button>

      <PinDialog
        visible={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onSubmit={verifyPin}
      />
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
