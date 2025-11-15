import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { buyElectricity, verifyMeterNumber } from "../../../lib/vtpass";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";

const discos = [
  { id: "ikeja-electric", name: "Ikeja Electric", short: "IKEDC", icon: "⚡" },
  { id: "eko-electric", name: "Eko Electric", short: "EKEDC", icon: "💡" },
  { id: "abuja-electric", name: "Abuja Electric", short: "AEDC", icon: "🔌" },
  { id: "kano-electric", name: "Kano Electric", short: "KEDCO", icon: "⚡" },
];

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export default function ElectricityPage() {
  const { balance: globalBalance, deductBalance, addTransaction } = useApp();
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [disco, setDisco] = useState("");
  const [meter, setMeter] = useState("");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [amount, setAmount] = useState("");
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setBalance(globalBalance || 0);
    setInitialLoading(false);
  }, [globalBalance]);

  const handleVerify = async () => {
    if (!disco || !meter) {
      Alert.alert("Invalid", "Choose a disco and enter meter number");
      return;
    }
    setVerifying(true);
    setCustomerName(null);
    try {
      const resp = await verifyMeterNumber({ serviceID: disco, billersCode: meter });
      if (resp?.Customer_Name) {
        setCustomerName(resp.Customer_Name);
        Alert.alert("✅ Verified", `Meter belongs to:\n${resp.Customer_Name}`);
      } else {
        throw new Error("Could not verify meter");
      }
    } catch (err: any) {
      console.error("verify:", err);
      Alert.alert("❌ Error", err?.message || "Failed verification");
    } finally {
      setVerifying(false);
    }
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      const amt = parseFloat(amount);
      if (!disco || !meter) throw new Error("Disco and meter required");
      if (!customerName) throw new Error("Please verify meter first");
      if (isNaN(amt) || amt < 100) throw new Error("Minimum amount is ₦100");
      if (amt > balance) throw new Error("Insufficient balance");

      const res = await buyElectricity({
        serviceID: disco,
        billersCode: meter,
        variation_code: meterType,
        amount: amt,
        phone: user?.phoneNumber || "08011111111",
      });

      if (!res || res.code !== "000") throw new Error(res.response_description || "Transaction failed");

      await deductBalance(amt, `Electricity ${disco} - ${meter}`, "Electricity");
      await addTransaction({
        description: `Electricity payment ${meter}`,
        amount: amt,
        type: "debit",
        category: "Electricity",
        status: "success",
      });

      Alert.alert("✅ Success", "Electricity purchase successful. Check your meter or email for token.");
      setDisco("");
      setMeter("");
      setCustomerName(null);
      setAmount("");
      router.back();
    } catch (err: any) {
      console.error("electricity:", err);
      Alert.alert("❌ Error", err?.message || "Could not complete payment");
    } finally {
      setLoading(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const selectedDisco = discos.find((d) => d.id === disco);
  const canPurchase = disco && meter && customerName && numAmount >= 100 && numAmount <= balance;

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
          <Text style={styles.headerTitle}>⚡ Electricity</Text>
          <Text style={styles.headerSubtitle}>Pay for prepaid & postpaid meters</Text>
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

      {/* Disco Selection */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionLabel}>🏢 Select Distribution Company</Text>
          <View style={styles.discoGrid}>
            {discos.map((d) => {
              const isSelected = disco === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => {
                    setDisco(d.id);
                    setCustomerName(null); // Reset verification
                  }}
                  style={[
                    styles.discoCard,
                    isSelected && styles.discoCardSelected,
                  ]}
                >
                  <Text style={styles.discoIcon}>{d.icon}</Text>
                  <Text style={[
                    styles.discoShort,
                    isSelected && styles.discoShortSelected
                  ]}>
                    {d.short}
                  </Text>
                  <Text style={styles.discoName} numberOfLines={2}>
                    {d.name}
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

      {/* Meter Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionLabel}>🔢 Meter Details</Text>
          
          {/* Meter Type Toggle */}
          <View style={styles.meterTypeContainer}>
            <Pressable
              onPress={() => {
                setMeterType("prepaid");
                setCustomerName(null);
              }}
              style={[
                styles.meterTypeBtn,
                meterType === "prepaid" && styles.meterTypeBtnSelected,
              ]}
            >
              <FontAwesome5 
                name="bolt" 
                size={16} 
                color={meterType === "prepaid" ? PRIMARY_COLOR : "#666"} 
              />
              <Text style={[
                styles.meterTypeText,
                meterType === "prepaid" && styles.meterTypeTextSelected,
              ]}>
                Prepaid
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMeterType("postpaid");
                setCustomerName(null);
              }}
              style={[
                styles.meterTypeBtn,
                meterType === "postpaid" && styles.meterTypeBtnSelected,
              ]}
            >
              <FontAwesome5 
                name="file-invoice" 
                size={16} 
                color={meterType === "postpaid" ? PRIMARY_COLOR : "#666"} 
              />
              <Text style={[
                styles.meterTypeText,
                meterType === "postpaid" && styles.meterTypeTextSelected,
              ]}>
                Postpaid
              </Text>
            </Pressable>
          </View>

          {/* Meter Number Input */}
          <TextInput
            mode="outlined"
            keyboardType="numeric"
            value={meter}
            onChangeText={(text) => {
              setMeter(text);
              setCustomerName(null); // Reset verification
            }}
            placeholder="Enter meter number"
            style={styles.input}
            label="Meter Number"
            left={<TextInput.Icon icon="identifier" />}
            right={customerName ? <TextInput.Icon icon="check-circle" color={SUCCESS_COLOR} /> : null}
          />

          {/* Verify Button */}
          <Button
            mode="outlined"
            onPress={handleVerify}
            disabled={!disco || !meter || verifying}
            loading={verifying}
            style={styles.verifyButton}
            icon="shield-check"
          >
            {verifying ? "Verifying..." : "Verify Meter"}
          </Button>

          {/* Customer Name Display */}
          {customerName && (
            <Card style={styles.customerCard}>
              <Card.Content>
                <View style={styles.customerInfo}>
                  <FontAwesome5 name="user-check" size={24} color={SUCCESS_COLOR} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.customerLabel}>Verified Customer</Text>
                    <Text style={styles.customerName}>{customerName}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
        </Card.Content>
      </Card>

      {/* Amount Input */}
      {customerName && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionLabel}>💰 Enter Amount</Text>
            <TextInput
              mode="outlined"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount (Min: ₦100)"
              style={styles.input}
              left={<TextInput.Icon icon="currency-ngn" />}
              right={
                numAmount > 0 ? (
                  numAmount > balance ? (
                    <TextInput.Icon icon="alert-circle" color={ERROR_COLOR} />
                  ) : (
                    <TextInput.Icon icon="check-circle" color={SUCCESS_COLOR} />
                  )
                ) : null
              }
            />
            {numAmount > 0 && numAmount < 100 && (
              <Text style={styles.errorText}>Minimum amount is ₦100</Text>
            )}
            {numAmount > balance && (
              <Text style={styles.errorText}>Insufficient balance</Text>
            )}

            {/* Quick Amounts */}
            <View style={styles.quickAmountsContainer}>
              <Text style={styles.quickAmountsLabel}>Quick amounts:</Text>
              <View style={styles.quickAmountsGrid}>
                {QUICK_AMOUNTS.map((amt) => (
                  <Pressable
                    key={amt}
                    onPress={() => setAmount(amt.toString())}
                    style={[
                      styles.quickAmountBtn,
                      amount === amt.toString() && styles.quickAmountBtnSelected,
                    ]}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      amount === amt.toString() && styles.quickAmountTextSelected,
                    ]}>
                      ₦{amt >= 1000 ? `${amt/1000}k` : amt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Purchase Summary */}
      {canPurchase && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>📋 Purchase Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Disco:</Text>
              <Text style={styles.summaryValue}>{selectedDisco?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Meter Type:</Text>
              <Text style={[styles.summaryValue, { textTransform: "capitalize" }]}>
                {meterType}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Meter Number:</Text>
              <Text style={styles.summaryValue}>{meter}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Customer:</Text>
              <Text style={styles.summaryValue}>{customerName}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
              <Text style={styles.summaryTotalValue}>
                ₦{numAmount.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Balance After:</Text>
              <Text style={[styles.summaryValue, { color: SUCCESS_COLOR, fontWeight: "bold" }]}>
                ₦{(balance - numAmount).toLocaleString()}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Pay Button */}
      <Button
        mode="contained"
        onPress={handlePay}
        disabled={loading || !canPurchase}
        loading={loading}
        style={styles.payButton}
        contentStyle={styles.payButtonContent}
        icon="lightning-bolt"
      >
        {loading ? "Processing..." : "Pay Now"}
      </Button>

      {/* Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoRow}>
            <FontAwesome5 name="shield-alt" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.infoText}>Secure meter verification</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="bolt" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.infoText}>Instant token delivery</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="receipt" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.infoText}>Transaction receipt via email</Text>
          </View>
        </Card.Content>
      </Card>

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
  discoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  discoCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  discoCardSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: ACCENT_COLOR,
  },
  discoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  discoShort: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  discoShortSelected: {
    color: PRIMARY_COLOR,
  },
  discoName: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
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
  meterTypeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  meterTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "transparent",
  },
  meterTypeBtnSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: ACCENT_COLOR,
  },
  meterTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  meterTypeTextSelected: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
  },
  input: {
    backgroundColor: BACKGROUND_COLOR,
    marginBottom: 12,
  },
  verifyButton: {
    marginTop: 4,
  },
  customerCard: {
    marginTop: 16,
    backgroundColor: "#E8F5E9",
    elevation: 0,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  customerLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: SUCCESS_COLOR,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  quickAmountsContainer: {
    marginTop: 8,
  },
  quickAmountsLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  quickAmountsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickAmountBtn: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  quickAmountBtnSelected: {
    backgroundColor: ACCENT_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  quickAmountTextSelected: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
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
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
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
  payButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
  },
  payButtonContent: {
    paddingVertical: 8,
  },
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: "#E8F5E9",
    elevation: 0,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
});