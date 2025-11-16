import { FontAwesome5 } from "@expo/vector-icons";
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
  Chip,
  Divider,
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
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";

type SelectableItem = {
  name: string;
  price: number;
  quantity?: number;
  icon?: string;
};

const availableProteins: SelectableItem[] = [
  { name: "Chicken", price: 1000, icon: "🍗" },
  { name: "Beef", price: 800, icon: "🥩" },
  { name: "Fish", price: 900, icon: "🐟" },
  { name: "Goat Meat", price: 1200, icon: "🍖" },
];

const availableSoups: SelectableItem[] = [
  { name: "Egusi", price: 700, icon: "🥘" },
  { name: "Vegetable", price: 600, icon: "🥬" },
  { name: "Okro", price: 500, icon: "🫛" },
  { name: "Kuka", price: 400, icon: "🍲" },
];

const availableExtras: SelectableItem[] = [
  { name: "Plantain", price: 500, icon: "🍌" },
  { name: "Egg", price: 300, icon: "🥚" },
  { name: "Water", price: 200, icon: "💧" },
  { name: "Coleslaw", price: 400, icon: "🥗" },
];

export default function FoodDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, updateTransactionStatus, refreshBalance } =
    useApp();
  const { secureAction, showPinDialog, setShowPinDialog, verifyPin } =
    useSecureAction();

  const [food, setFood] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portionCount, setPortionCount] = useState(1);
  const [proteins, setProteins] = useState<SelectableItem[]>([]);
  const [soups, setSoups] = useState<SelectableItem[]>([]);
  const [extras, setExtras] = useState<SelectableItem[]>([]);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [subQuantity, setSubQuantity] = useState(1);
  const [subFromDate, setSubFromDate] = useState("");
  const [subToDate, setSubToDate] = useState("");

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

    const subscriptionMultiplier =
      subFromDate && subToDate ? subQuantity : 1;

    return (base + portionPrice + proteinTotal + extrasTotal + soupsTotal) * subscriptionMultiplier;
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
    if (!address.trim() || !phone.trim())
      return Alert.alert("Missing Info", "Enter delivery address and phone number.");
    if (!food) return;
    if (subFromDate && subToDate) {
      if (!subFromDate || !subToDate)
        return Alert.alert("Invalid Dates", "Please select subscription dates.");
    }

    const totalPrice = calculateTotal();
    if (balance < totalPrice)
      return Alert.alert("Insufficient Balance", "Top up your wallet.");

    let transactionId: string | null = null;

    try {
      setProcessing(true);

      // 🔥 Create ONE pending transaction
      transactionId = await addTransaction({
        description: `Ordered ${food.name}`,
        amount: totalPrice,
        category: "food",
        type: "debit",
        status: "pending",
      });

      // 🔥 Deduct balance WITHOUT creating another transaction
      await deductBalance(totalPrice, `Ordered ${food.name}`, "food");

      // Create the order
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
        phone,
        subQuantity: subFromDate && subToDate ? subQuantity : 1,
        subFromDate: subFromDate || null,
        subToDate: subToDate || null,
        totalPrice,
        transactionId, // 🔥 Link transaction to order
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // 🔥 Update transaction status to success
      if (transactionId) {
        await updateTransactionStatus(transactionId, "success");
      }

      await refreshBalance();
      
      Alert.alert(
        "✅ Order Successful",
        `Invoice #${orderRef.id}\n\nTotal: ₦${totalPrice.toLocaleString()}`
      );
      router.push({
        pathname: "/service/food/invoice",
        params: { orderId: orderRef.id },
      });
    } catch (err) {
      console.error(err);
      
      // 🔥 Mark transaction as failed if it was created
      if (transactionId) {
        await updateTransactionStatus(transactionId, "failed");
      }
      
      Alert.alert("Error", "Could not place order. Try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckoutSecure = () => secureAction(() => handleCheckout());

  const renderItemCard = (
    item: SelectableItem,
    isSelected: boolean,
    onPress: () => void,
    selectedItem?: SelectableItem
  ) => (
    <TouchableOpacity
      key={item.name}
      onPress={onPress}
      style={[styles.itemCard, isSelected && styles.itemCardSelected]}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemIcon}>{item.icon}</Text>
        {isSelected && (
          <View style={styles.selectedBadge}>
            <FontAwesome5 name="check" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemPrice}>₦{item.price.toLocaleString()}</Text>
      
      {isSelected && selectedItem && (
        <View style={styles.qtyControls}>
          <TouchableOpacity
            onPress={() => {
              if (item.name === selectedItem.name) {
                const list = proteins.includes(selectedItem) ? proteins : 
                             soups.includes(selectedItem) ? soups : extras;
                const setList = proteins.includes(selectedItem) ? setProteins :
                               soups.includes(selectedItem) ? setSoups : setExtras;
                changeItemQty(item.name, -1, list, setList);
              }
            }}
            style={styles.qtyBtn}
          >
            <FontAwesome5 name="minus" size={10} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{selectedItem.quantity || 1}</Text>
          <TouchableOpacity
            onPress={() => {
              if (item.name === selectedItem.name) {
                const list = proteins.includes(selectedItem) ? proteins : 
                             soups.includes(selectedItem) ? soups : extras;
                const setList = proteins.includes(selectedItem) ? setProteins :
                               soups.includes(selectedItem) ? setSoups : setExtras;
                changeItemQty(item.name, 1, list, setList);
              }
            }}
            style={styles.qtyBtn}
          >
            <FontAwesome5 name="plus" size={10} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );

  if (!food) return null;

  const total = calculateTotal();
  const hasSelections = portionCount > 0 || proteins.length > 0 || soups.length > 0 || extras.length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {food.thumbnail ? (
            <Image source={{ uri: food.thumbnail }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Text style={styles.heroIcon}>🍲</Text>
            </View>
          )}
          <View style={styles.heroOverlay}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <FontAwesome5 name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Food Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{food.name}</Text>
                <View style={styles.metaRow}>
                  <Chip icon="silverware-fork-knife" compact style={styles.metaChip}>
                    {food.mealType}
                  </Chip>
                  <Chip compact style={styles.metaChip}>
                    {food.cuisineType}
                  </Chip>
                </View>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Base Price</Text>
                <Text style={styles.priceValue}>₦{food.price?.toLocaleString()}</Text>
              </View>
            </View>
            {food.description && (
              <Text style={styles.description}>{food.description}</Text>
            )}
          </Card.Content>
        </Card>

        {/* Portion Selection */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>🍽️ Select Portions</Text>
            <Text style={styles.sectionSubtitle}>₦1,000 per portion</Text>
            <View style={styles.portionRow}>
              {[1, 2, 3, 4, 5].map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPortionCount(p)}
                  style={[
                    styles.portionBtn,
                    portionCount === p && styles.portionBtnSelected,
                  ]}
                >
                  <Text style={[
                    styles.portionText,
                    portionCount === p && styles.portionTextSelected,
                  ]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setPortionCount(portionCount + 1)}
                style={styles.portionBtnMore}
              >
                <FontAwesome5 name="plus" size={16} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            </View>
            {portionCount > 5 && (
              <Text style={styles.customPortionText}>
                {portionCount} portions selected
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Proteins */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>🍗 Add Proteins</Text>
            <Text style={styles.sectionSubtitle}>Optional add-ons</Text>
            <View style={styles.itemGrid}>
              {availableProteins.map((item) => {
                const selected = proteins.find((p) => p.name === item.name);
                return renderItemCard(
                  item,
                  !!selected,
                  () => toggleItem(item, proteins, setProteins),
                  selected
                );
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Soups */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>🥘 Choose Soups</Text>
            <Text style={styles.sectionSubtitle}>Pick your favorite</Text>
            <View style={styles.itemGrid}>
              {availableSoups.map((item) => {
                const selected = soups.find((s) => s.name === item.name);
                return renderItemCard(
                  item,
                  !!selected,
                  () => toggleItem(item, soups, setSoups),
                  selected
                );
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Extras */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>➕ Extra Items</Text>
            <Text style={styles.sectionSubtitle}>Sides and drinks</Text>
            <View style={styles.itemGrid}>
              {availableExtras.map((item) => {
                const selected = extras.find((e) => e.name === item.name);
                return renderItemCard(
                  item,
                  !!selected,
                  () => toggleItem(item, extras, setExtras),
                  selected
                );
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Subscription */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.subscriptionHeader}>
              <View>
                <Text style={styles.sectionTitle}>📅 Subscription Plan</Text>
                <Text style={styles.sectionSubtitle}>Optional recurring orders</Text>
              </View>
            </View>

            <View style={styles.subQuantityRow}>
              <Text style={styles.subLabel}>Daily Quantity:</Text>
              <View style={styles.subControls}>
                <TouchableOpacity
                  onPress={() => setSubQuantity(Math.max(1, subQuantity - 1))}
                  style={styles.subBtn}
                >
                  <FontAwesome5 name="minus" size={14} color={PRIMARY_COLOR} />
                </TouchableOpacity>
                <Text style={styles.subQuantityText}>{subQuantity}</Text>
                <TouchableOpacity
                  onPress={() => setSubQuantity(subQuantity + 1)}
                  style={styles.subBtn}
                >
                  <FontAwesome5 name="plus" size={14} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Start Date (YYYY-MM-DD)"
              placeholder="2024-01-01"
              value={subFromDate}
              onChangeText={setSubFromDate}
              style={styles.dateInput}
              left={<TextInput.Icon icon="calendar-start" />}
            />
            <TextInput
              mode="outlined"
              label="End Date (YYYY-MM-DD)"
              placeholder="2024-01-31"
              value={subToDate}
              onChangeText={setSubToDate}
              style={styles.dateInput}
              left={<TextInput.Icon icon="calendar-end" />}
            />
          </Card.Content>
        </Card>

        {/* Delivery Info */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📍 Delivery Information</Text>
            <TextInput
              mode="outlined"
              label="Delivery Address"
              placeholder="Enter your full address"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
              style={styles.input}
              left={<TextInput.Icon icon="map-marker" />}
            />
            <TextInput
              mode="outlined"
              label="Phone Number"
              placeholder="08012345678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
              left={<TextInput.Icon icon="phone" />}
            />
          </Card.Content>
        </Card>

        {/* Order Summary (Expandable) */}
        {hasSelections && (
          <Card style={styles.summaryCard}>
            <TouchableOpacity
              onPress={() => setShowSummary(!showSummary)}
              style={styles.summaryHeader}
            >
              <Text style={styles.summaryTitle}>📋 Order Summary</Text>
              <FontAwesome5
                name={showSummary ? "chevron-up" : "chevron-down"}
                size={16}
                color={PRIMARY_COLOR}
              />
            </TouchableOpacity>
            
            {showSummary && (
              <Card.Content>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Base Price:</Text>
                  <Text style={styles.summaryValue}>₦{food.price?.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Portions ({portionCount}):</Text>
                  <Text style={styles.summaryValue}>₦{(portionCount * 1000).toLocaleString()}</Text>
                </View>
                {proteins.length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Proteins:</Text>
                    <Text style={styles.summaryValue}>
                      ₦{proteins.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0).toLocaleString()}
                    </Text>
                  </View>
                )}
                {soups.length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Soups:</Text>
                    <Text style={styles.summaryValue}>
                      ₦{soups.reduce((sum, s) => sum + s.price * (s.quantity || 1), 0).toLocaleString()}
                    </Text>
                  </View>
                )}
                {extras.length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Extras:</Text>
                    <Text style={styles.summaryValue}>
                      ₦{extras.reduce((sum, e) => sum + e.price * (e.quantity || 1), 0).toLocaleString()}
                    </Text>
                  </View>
                )}
                {subFromDate && subToDate && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subscription (×{subQuantity}):</Text>
                    <Text style={styles.summaryValue}>Included</Text>
                  </View>
                )}
                <Divider style={{ marginVertical: 12 }} />
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryTotalLabel}>Total:</Text>
                  <Text style={styles.summaryTotalValue}>₦{total.toLocaleString()}</Text>
                </View>
              </Card.Content>
            )}
          </Card>
        )}
      </ScrollView>

      {/* Sticky Bottom Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.bottomContent}>
          <View>
            <Text style={styles.bottomLabel}>Total Amount</Text>
            <Text style={styles.bottomTotal}>₦{total.toLocaleString()}</Text>
          </View>
          <Button
            mode="contained"
            loading={processing}
            disabled={processing || !address || !phone}
            onPress={handleCheckoutSecure}
            style={styles.checkoutButton}
            contentStyle={styles.checkoutButtonContent}
            icon="shopping"
          >
            Place Order
          </Button>
        </View>
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
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  heroContainer: {
    position: "relative",
    height: 280,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  heroIcon: {
    fontSize: 64,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: -40,
    marginBottom: 16,
    elevation: 4,
    borderRadius: 16,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  foodName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
  },
  metaChip: {
    height: 28,
    backgroundColor: ACCENT_COLOR,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
  },
  portionRow: {
    flexDirection: "row",
    gap: 12,
  },
  portionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  portionBtnSelected: {
    backgroundColor: ACCENT_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  portionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
  },
  portionTextSelected: {
    color: PRIMARY_COLOR,
    fontWeight: "bold",
  },
  portionBtnMore: {
    width: 60,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  customPortionText: {
    marginTop: 12,
    textAlign: "center",
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  itemCard: {
    width: "47%",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  itemCardSelected: {
    backgroundColor: ACCENT_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemIcon: {
    fontSize: 32,
  },
  selectedBadge: {
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
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 8,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  subQuantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  subControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  subQuantityText: {
    fontSize: 18,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    minWidth: 30,
    textAlign: "center",
  },
  dateInput: {
    marginBottom: 12,
    backgroundColor: BACKGROUND_COLOR,
  },
  input: {
    marginBottom: 12,
    backgroundColor: BACKGROUND_COLOR,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  summaryTotal: {
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BACKGROUND_COLOR,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  bottomLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  bottomTotal: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  checkoutButton: {
    borderRadius: 12,
  },
  checkoutButtonContent: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});