import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Text, TextInput } from "react-native-paper";
import { icons } from "../../../constants/icons";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";
import { buyData, DataPlan, getDataPlans } from "../../../lib/vtpass";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";

const NETWORK_COLORS = {
  mtn: "#FFCC00",
  glo: "#00B140",
  airtel: "#ED1C24",
  "9mobile": "#00923F",
};

const NETWORK_ICONS = {
  mtn: icons.mtn,
  airtel: icons.airtel,
  glo: icons.glo,
  "9mobile": icons.etisalat,
};

export default function DataPage() {
  const { user } = useAuth();
  const { balance: globalBalance, deductBalance, addTransaction } = useApp();
  const [balance, setBalance] = useState<number>(0);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("");
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filter, setFilter] = useState<"daily" | "weekly" | "monthly" | "all">("all");

  useEffect(() => {
    setBalance(globalBalance || 0);
    setInitialLoading(false);
  }, [globalBalance]);

  const fetchPlans = async (svc: string) => {
    setPlansLoading(true);
    try {
      const serviceID = `${svc}-data`;
      let dataPlans = await getDataPlans(serviceID);

      if (filter !== "all") {
        const regex = new RegExp(filter, "i");
        dataPlans = dataPlans.filter(p => regex.test(p.name));
      }

      dataPlans.sort((a, b) => parseFloat(a.variation_amount) - parseFloat(b.variation_amount));

      setPlans(dataPlans || []);
      setSelectedPlan(null);
    } catch (err: any) {
      console.error("fetch plans:", err);
      Alert.alert("Error", err?.message || "Could not fetch plans");
    } finally {
      setPlansLoading(false);
    }
  };

  const handleFetchPlansForNetwork = (n: string) => {
    setNetwork(n);
    fetchPlans(n);
  };

  const createTransaction = async (
    amt: number,
    planName: string,
    phone: string,
    network: string,
    status: "success" | "failed" | "pending",
    reference?: string
  ) => {
    if (!user) return null;
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.exists() ? userSnap.data()?.fullName || "You" : "You";

      const transactionData = {
        senderId: user.uid,
        senderName: userName,
        receiverId: null,
        receiverName: phone,
        amount: amt,
        type: "Data Purchase",
        category: "Data",
        status,
        description: `${planName} to ${phone}`,
        reference: reference || `DATA-${Date.now()}`,
        createdAt: serverTimestamp(),
        metadata: { network, phoneNumber: phone, service: "data", planName }
      };

      const docRef = await addDoc(collection(db, "transactions"), transactionData);

      await addTransaction({
        description: `${planName} to ${phone}`,
        amount: amt,
        type: "debit",
        category: "Data",
        status,
      });

      return docRef.id;
    } catch (error) {
      console.error("Error creating transaction:", error);
      return null;
    }
  };

  const handleBuy = async () => {
    setLoading(true);
    let transactionId: string | null = null;
    try {
      if (!/^\d{11}$/.test(phone)) throw new Error("Enter a valid 11-digit phone number");
      if (!network) throw new Error("Select network");
      if (!selectedPlan) throw new Error("Choose a data plan");

      const amt = parseFloat(selectedPlan.variation_amount);
      if (isNaN(amt) || amt <= 0) throw new Error("Invalid plan amount");
      if (amt > balance) throw new Error("Insufficient balance");

      transactionId = await createTransaction(amt, selectedPlan.name, phone, network, "pending");

      const res = await buyData({
        serviceID: `${network}-data`,
        billersCode: phone,
        variation_code: selectedPlan.variation_code,
        amount: amt,
        phone,
      });

      if (!res || res.code !== "000") {
        if (transactionId) {
          await updateDoc(doc(db, "transactions", transactionId), {
            status: "failed",
            failureReason: res?.response_description || "Data purchase failed",
          });
        }
        throw new Error(res?.response_description || "Data purchase failed");
      }

      await deductBalance(amt, `Data ${selectedPlan.name} to ${phone}`, "Data");
      if (transactionId) {
        await updateDoc(doc(db, "transactions", transactionId), {
          status: "success",
          completedAt: serverTimestamp(),
        });
      }

      Alert.alert("✅ Success", `You purchased ${selectedPlan.name} for ${phone}`, [
        { 
          text: "View Receipt", 
          onPress: () => {
            if (transactionId) {
              router.push({ 
                pathname: "/components/trans/Transaction-Receipt", 
                params: { id: transactionId } 
              });
            }
          }
        },
        { text: "Done", onPress: () => router.back() }
      ]);

      setPhone("");
      setNetwork("");
      setPlans([]);
      setSelectedPlan(null);
    } catch (err: any) {
      console.error("Data purchase:", err);
      if (transactionId) {
        await updateDoc(doc(db, "transactions", transactionId), {
          status: "failed",
          failureReason: err?.message || "Unknown error",
        }).catch(console.error);
      }
      Alert.alert("❌ Error", err?.message || "Data purchase failed");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
    <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Buy Data",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.back()} >
                <MaterialIcons name="arrow-back" size={24} color="#fff" style={{ paddingLeft: 5 }} />
              </Pressable>
            );
          },
          headerRight: () => (
            <Pressable 
              onPress={() => router.push("/profile/transaction-history")}
              style={{ paddingLeft: 8 }}
            >
              <FontAwesome5 name="history" size={20} color="#fff" />
            </Pressable>
          ),
        }}
      />
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}

      {/* Balance Card */}
      <Card style={styles.balanceCard }>
        <Card.Content>
          <View style={styles.balanceContent}>
            <View>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <View style={styles.balanceRow}>
                <FontAwesome5 name="wallet" size={20} color={BACKGROUND_COLOR} />
                <Text style={styles.balanceAmount}>₦{balance.toLocaleString()}</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push("/wallet/add-funds")} style={styles.topUpButton}>
              <FontAwesome5 name="plus-circle" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.topUpText}>Top Up</Text>
            </Pressable>
          </View>
        </Card.Content>
      </Card>

      {/* Phone Input */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionLabel}>📱 Phone Number</Text>
          <TextInput
            mode="outlined"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter 11-digit phone number"
            style={styles.input}
            maxLength={11}
            left={<TextInput.Icon icon="phone" />}
            right={phone.length === 11 ? <TextInput.Icon icon="check-circle" color={SUCCESS_COLOR} /> : null}
          />
          {phone && phone.length !== 11 && <Text style={styles.errorText}>Phone number must be 11 digits</Text>}
        </Card.Content>
      </Card>

      {/* Network Selection */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionLabel}>🌐 Select Network</Text>
          <View style={styles.networkGrid}>
            {(["mtn", "glo", "airtel", "9mobile"] as const).map((n) => {
              const isSelected = network === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => handleFetchPlansForNetwork(n)}
                  style={[styles.networkCard, isSelected && styles.networkCardSelected]}
                >
                  <View style={[styles.networkIconContainer, { backgroundColor: NETWORK_COLORS[n] + "20" }]}>
                    <Image
                        source={NETWORK_ICONS[n]}
                        style={{ width: 28, height: 28, resizeMode: "contain" }}
                    />
                  </View>
                  <Text style={[styles.networkName, isSelected && styles.networkNameSelected]}>{n.toUpperCase()}</Text>
                  {isSelected && <View style={styles.selectedBadge}><FontAwesome5 name="check" size={10} color={BACKGROUND_COLOR} /></View>}
                </Pressable>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      {/* Filter Chips */}
      {plans.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
          {["all", "daily", "weekly", "monthly"].map(f => (
            <Chip
              key={`chip-${f}`}
              mode="outlined"
              selected={filter === f}
              onPress={() => { 
                setFilter(f as any); 
                network && fetchPlans(network); 
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Chip>
          ))}
        </View>
      )}

      {/* Plans List */}
      {plansLoading ? (
        <View style={styles.plansLoading}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      ) : plans.length > 0 ? (
        <FlatList
          data={plans}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.variation_code}
          renderItem={({ item }) => {
            const isSelected = selectedPlan?.variation_code === item.variation_code;
            const amount = parseFloat(item.variation_amount);
            return (
              <Pressable onPress={() => setSelectedPlan(item)} style={[styles.planCard, isSelected && styles.planCardSelected]}>
                {isSelected && (
                  <View style={styles.planSelectedBadge}>
                    <FontAwesome5 name="check-circle" size={16} color={SUCCESS_COLOR} />
                  </View>
                )}
                <View style={styles.planIconContainer}>
                  <FontAwesome5 name="database" size={24} color={PRIMARY_COLOR} />
                </View>
                <Text style={styles.planName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.planPriceContainer}>
                  <Text style={styles.planCurrency}>₦</Text>
                  <Text style={styles.planPrice}>{amount.toLocaleString()}</Text>
                </View>
                {item.name.match(/\d+\s*Day/i) && (
                  <Chip compact style={styles.validityChip} textStyle={styles.validityText}>
                    {item.name.match(/\d+\s*Day/i)?.[0]}
                  </Chip>
                )}
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        />
      ) : network ? (
        <View style={styles.plansLoading}>
          <Text style={styles.emptyText}>No plans available</Text>
        </View>
      ) : null}

      {/* Summary */}
      {selectedPlan && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>📋 Purchase Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Plan:</Text>
              <Text style={styles.summaryValue}>{selectedPlan.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phone:</Text>
              <Text style={styles.summaryValue}>{phone || "Not entered"}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Network:</Text>
              <Text style={[styles.summaryValue, { textTransform: "uppercase" }]}>{network}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
              <Text style={styles.summaryTotalValue}>₦{parseFloat(selectedPlan.variation_amount).toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Balance After:</Text>
              <Text style={[styles.summaryValue, { color: SUCCESS_COLOR, fontWeight: "bold" }]}>
                ₦{(balance - parseFloat(selectedPlan.variation_amount)).toLocaleString()}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Buy Button */}
      <Button
        mode="contained"
        onPress={handleBuy}
        disabled={loading || !phone || !network || !selectedPlan || phone.length !== 11}
        loading={loading}
        style={styles.buyButton}
        contentStyle={styles.buyButtonContent}
        icon="shopping"
      >
        {loading ? "Processing..." : "Buy Data Now"}
      </Button>

      {/* Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoRow}>
            <FontAwesome5 name="shield-alt" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.infoText}>Secure transaction processing</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="bolt" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.infoText}>Instant data delivery</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="receipt" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.infoText}>Transaction receipt available</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F5F5" },
  loadingText: { marginTop: 8, color: PRIMARY_COLOR, fontSize: 14 },
  header: { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 20 },
  backButton: { marginRight: 12, padding: 8 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: PRIMARY_COLOR, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: "#666" },
  balanceCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, backgroundColor: PRIMARY_COLOR, elevation: 4, marginTop: 16 },
  balanceContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginBottom: 8 },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  balanceAmount: { color: BACKGROUND_COLOR, fontSize: 24, fontWeight: "bold" },
  topUpButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: BACKGROUND_COLOR, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  topUpText: { color: PRIMARY_COLOR, fontWeight: "600", fontSize: 13 },
  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, elevation: 2 },
  sectionLabel: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12 },
  input: { backgroundColor: BACKGROUND_COLOR },
  errorText: { color: ERROR_COLOR, marginTop: 4, fontSize: 12 },
  networkGrid: { flexDirection: "row", gap: 8 },
  networkCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 2, borderColor: "transparent", backgroundColor: "#F8F9FA", position: "relative" },
  networkCardSelected: { borderColor: PRIMARY_COLOR, backgroundColor: ACCENT_COLOR },
  networkIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  networkIcon: { fontSize: 24 },
  networkName: { fontSize: 12, fontWeight: "600", color: "#666", textAlign: "center" },
  networkNameSelected: { color: PRIMARY_COLOR, fontWeight: "700" },
  selectedBadge: { position: "absolute", top: 8, right: 8, backgroundColor: SUCCESS_COLOR, borderRadius: 10, width: 20, height: 20, justifyContent: "center", alignItems: "center" },
  plansLoading: { justifyContent: "center", alignItems: "center", padding: 32 },
  emptyText: { color: "#999", fontSize: 14 },
  planCard: { width: 140, padding: 16, marginRight: 12, borderRadius: 16, borderWidth: 2, borderColor: "#E0E0E0", backgroundColor: BACKGROUND_COLOR, alignItems: "center", position: "relative", elevation: 2 },
  planCardSelected: { borderColor: PRIMARY_COLOR, backgroundColor: ACCENT_COLOR },
  planSelectedBadge: { position: "absolute", top: 8, right: 8, zIndex: 1 },
  planIconContainer: { marginBottom: 12, width: 48, height: 48, borderRadius: 24, backgroundColor: ACCENT_COLOR, justifyContent: "center", alignItems: "center" },
  planName: { fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 8, minHeight: 40, color: "#333" },
  planPriceContainer: { flexDirection: "row", alignItems: "baseline", marginBottom: 8 },
  planCurrency: { fontSize: 12, color: PRIMARY_COLOR, marginRight: 2 },
  planPrice: { fontSize: 18, fontWeight: "bold", color: PRIMARY_COLOR },
  validityChip: { marginTop: 4, backgroundColor: "#E8F5E9", height: 24 },
  validityText: { fontSize: 10, color: SUCCESS_COLOR, fontWeight: "600" },
  summaryCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, backgroundColor: "#F8F9FA", elevation: 1 },
  summaryTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: "#666" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: "#333", maxWidth: "60%", textAlign: "right" },
  summaryTotal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderColor: "#E0E0E0" },
  summaryTotalLabel: { fontSize: 16, fontWeight: "600", color: "#333" },
  summaryTotalValue: { fontSize: 20, fontWeight: "bold", color: PRIMARY_COLOR },
  buyButton: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, elevation: 4 },
  buyButtonContent: { paddingVertical: 8 },
  infoCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: "#E8F5E9", elevation: 0, borderRadius: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", marginVertical: 6, gap: 12 },
  infoText: { fontSize: 13, color: "#333", flex: 1 },
});
