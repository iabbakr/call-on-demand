import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Text, TextInput } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
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
  mtn: "📱",
  glo: "🌐",
  airtel: "📡",
  "9mobile": "📞",
};

export default function DataPage() {
  const { balance: globalBalance, deductBalance, addTransaction } = useApp();
  const [balance, setBalance] = useState<number>(0);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("");
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setBalance(globalBalance || 0);
    setInitialLoading(false);
  }, [globalBalance]);

  // Fetch VTpass data plans for selected network
  const fetchPlans = async (svc: string) => {
    setPlansLoading(true);
    try {
      const serviceID = `${svc}-data`;
      const dataPlans = await getDataPlans(serviceID);
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

  const handleBuy = async () => {
    setLoading(true);
    try {
      if (!/^\d{11}$/.test(phone)) throw new Error("Enter a valid 11-digit phone number");
      if (!network) throw new Error("Select network");
      if (!selectedPlan) throw new Error("Choose a data plan");

      const amt = parseFloat(selectedPlan.variation_amount);
      if (isNaN(amt) || amt <= 0) throw new Error("Invalid plan amount");
      if (amt > balance) throw new Error("Insufficient balance");

      const res = await buyData({
        serviceID: `${network}-data`,
        billersCode: phone,
        variation_code: selectedPlan.variation_code,
        amount: amt,
        phone,
      });

      if (!res || res.code !== "000") throw new Error(res.response_description || "Data purchase failed");

      await deductBalance(amt, `Data ${selectedPlan.name} to ${phone}`, "Data");
      await addTransaction({
        description: `Data purchase ${selectedPlan.name}`,
        amount: amt,
        type: "debit",
        category: "Data",
        status: "success",
      });

      Alert.alert("Success", `You purchased ${selectedPlan.name} for ${phone}`);
      setPhone("");
      setNetwork("");
      setPlans([]);
      setSelectedPlan(null);
      router.back();
    } catch (err: any) {
      console.error("Data purchase:", err);
      Alert.alert("Error", err?.message || "Data purchase failed");
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={PRIMARY_COLOR} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📶 Buy Data</Text>
          <Text style={styles.headerSubtitle}>Quick and easy data purchase</Text>
        </View>
      </View>

      {/* Balance Card */}
      <Card style={styles.balanceCard}>
        <Card.Content>
          <View style={styles.balanceContent}>
            <View>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <View style={styles.balanceRow}>
                <FontAwesome5 name="wallet" size={20} color={BACKGROUND_COLOR} />
                <Text style={styles.balanceAmount}>₦{balance.toLocaleString()}</Text>
              </View>
            </View>
            <Pressable 
              onPress={() => router.push("/wallet/add-funds")}
              style={styles.topUpButton}
            >
              <FontAwesome5 name="plus-circle" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.topUpText}>Top Up</Text>
            </Pressable>
          </View>
        </Card.Content>
      </Card>

      {/* Phone Number Input */}
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
          {phone && phone.length !== 11 && (
            <Text style={styles.errorText}>Phone number must be 11 digits</Text>
          )}
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
                  style={[
                    styles.networkCard,
                    isSelected && styles.networkCardSelected,
                  ]}
                >
                  <View style={[
                    styles.networkIconContainer,
                    { backgroundColor: NETWORK_COLORS[n] + "20" }
                  ]}>
                    <Text style={styles.networkIcon}>{NETWORK_ICONS[n]}</Text>
                  </View>
                  <Text style={[
                    styles.networkName,
                    isSelected && styles.networkNameSelected
                  ]}>
                    {n.toUpperCase()}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <FontAwesome5 name="check" size={10} color={BACKGROUND_COLOR} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      {/* Data Plans */}
      {network && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.plansHeader}>
              <Text style={styles.sectionLabel}>📊 Choose Data Plan</Text>
              {plans.length > 0 && (
                <Chip compact style={styles.plansCount}>
                  {plans.length} plans
                </Chip>
              )}
            </View>

            {plansLoading ? (
              <View style={styles.plansLoading}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <Text style={styles.loadingText}>Loading plans...</Text>
              </View>
            ) : plans.length === 0 ? (
              <View style={styles.emptyPlans}>
                <FontAwesome5 name="inbox" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No plans available</Text>
              </View>
            ) : (
              <FlatList
                data={plans}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.variation_code}
                renderItem={({ item }) => {
                  const isSelected = selectedPlan?.variation_code === item.variation_code;
                  const amount = parseFloat(item.variation_amount);
                  
                  return (
                    <Pressable
                      onPress={() => setSelectedPlan(item)}
                      style={[
                        styles.planCard,
                        isSelected && styles.planCardSelected,
                      ]}
                    >
                      {isSelected && (
                        <View style={styles.planSelectedBadge}>
                          <FontAwesome5 name="check-circle" size={16} color={SUCCESS_COLOR} />
                        </View>
                      )}
                      
                      <View style={styles.planIconContainer}>
                        <FontAwesome5 name="database" size={24} color={PRIMARY_COLOR} />
                      </View>

                      <Text style={styles.planName} numberOfLines={2}>
                        {item.name}
                      </Text>

                      <View style={styles.planPriceContainer}>
                        <Text style={styles.planCurrency}>₦</Text>
                        <Text style={styles.planPrice}>
                          {amount.toLocaleString()}
                        </Text>
                      </View>

                      {/* Validity badge if available */}
                      {item.name.includes("Day") && (
                        <Chip
                          compact
                          style={styles.validityChip}
                          textStyle={styles.validityText}
                        >
                          {item.name.match(/\d+\s*Day/i)?.[0] || "Daily"}
                        </Chip>
                      )}
                    </Pressable>
                  );
                }}
                contentContainerStyle={styles.plansList}
              />
            )}
          </Card.Content>
        </Card>
      )}

      {/* Selected Plan Summary */}
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
              <Text style={[styles.summaryValue, { textTransform: "uppercase" }]}>
                {network}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
              <Text style={styles.summaryTotalValue}>
                ₦{parseFloat(selectedPlan.variation_amount).toLocaleString()}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Buy Button */}
      <Button
        mode="contained"
        onPress={handleBuy}
        disabled={loading || !phone || !network || !selectedPlan}
        loading={loading}
        style={styles.buyButton}
        contentStyle={styles.buyButtonContent}
        icon="shopping"
      >
        {loading ? "Processing..." : "Buy Data Now"}
      </Button>

      <View style={{ height: 40 }} />
    </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  balanceCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: PRIMARY_COLOR,
    elevation: 4,
  },
  balanceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceAmount: {
    color: BACKGROUND_COLOR,
    fontSize: 24,
    fontWeight: "bold",
  },
  topUpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BACKGROUND_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topUpText: {
    color: PRIMARY_COLOR,
    fontWeight: "600",
    fontSize: 13,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  input: {
    backgroundColor: BACKGROUND_COLOR,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginTop: 4,
  },
  networkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  networkCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  networkCardSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: ACCENT_COLOR,
  },
  networkIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  networkIcon: {
    fontSize: 28,
  },
  networkName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  networkNameSelected: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: SUCCESS_COLOR,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  plansHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  plansCount: {
    backgroundColor: ACCENT_COLOR,
  },
  plansLoading: {
    padding: 40,
    alignItems: "center",
  },
  emptyPlans: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 12,
    color: "#999",
    fontSize: 14,
  },
  plansList: {
    paddingVertical: 8,
  },
  planCard: {
    width: 160,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    position: "relative",
  },
  planCardSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: ACCENT_COLOR,
  },
  planSelectedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  planName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    minHeight: 40,
  },
  planPriceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  planCurrency: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginLeft: 2,
  },
  validityChip: {
    alignSelf: "flex-start",
    height: 24,
    backgroundColor: "#E8F5E9",
  },
  validityText: {
    fontSize: 10,
    color: SUCCESS_COLOR,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#F8F9FA",
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  buyButton: {
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 4,
  },
  buyButtonContent: {
    paddingVertical: 8,
  },
});