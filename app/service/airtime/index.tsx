// airtime/index.tsx - Improved with Transaction Integration
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { icons } from "../../../constants/icons";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { useSecureAction } from "../../../hooks/useSecureAction";
import { db } from "../../../lib/firebase";
import { buyAirtime } from "../../../lib/vtpass";
import PinDialog from "../../components/security/PinDialog";

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

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function AirtimePage() {
  const { user } = useAuth();
  const { balance, deductBalance, addTransaction } = useApp();
  const { secureAction, showPinDialog, setShowPinDialog, verifyPin } = useSecureAction();
  const [localBalance, setLocalBalance] = useState<number>(0);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setLocalBalance(balance || 0);
    setInitialLoading(false);
  }, [balance]);

  const handleSecureBuy = () => {
    secureAction(() => handleBuy());
  };

  const createTransaction = async (
    amt: number, 
    phone: string, 
    network: string, 
    status: "success" | "failed" | "pending",
    reference?: string
  ) => {
    if (!user) return null;

    try {
      // Get user's full name for transaction
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.exists() ? userSnap.data()?.fullName || "You" : "You";

      const transactionData = {
        senderId: user.uid,
        senderName: userName,
        receiverId: null, // Airtime purchases don't have a receiver user
        receiverName: phone, // Store phone number as "receiver"
        amount: amt,
        type: "Airtime Purchase",
        category: "Airtime",
        status: status,
        description: `${network.toUpperCase()} Airtime to ${phone}`,
        reference: reference || `AIR-${Date.now()}`,
        createdAt: serverTimestamp(),
        metadata: {
          network: network,
          phoneNumber: phone,
          service: "airtime",
        }
      };

      const docRef = await addDoc(collection(db, "transactions"), transactionData);
      
      // Also add to app context for immediate UI update
      await addTransaction({
        description: `${network.toUpperCase()} Airtime to ${phone}`,
        amount: amt,
        type: "debit",
        category: "Airtime",
        status: status,
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
      // Validation
      if (!/^\d{11}$/.test(phone)) throw new Error("Enter a valid 11-digit phone number");
      if (!network) throw new Error("Select a network");
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt < 50) throw new Error("Amount must be at least ₦50");
      if (amt > localBalance) throw new Error("Insufficient balance");

      // Create pending transaction first
      transactionId = await createTransaction(amt, phone, network, "pending");

      const airtimeServiceID = network === "9mobile" ? "etisalat" : network;

      // Attempt the airtime purchase
      const res = await buyAirtime({ 
        serviceID: airtimeServiceID, 
        amount: amt, 
        phone 
      });

      if (!res || res.code !== "000") {
        // Transaction failed - update status
        if (transactionId) {
          await updateDoc(doc(db, "transactions", transactionId), {
            status: "failed",
            failureReason: res?.response_description || "Transaction failed",
          });
        }
        throw new Error(res?.response_description || "Transaction failed");
      }

      // Success - deduct balance and update transaction
      await deductBalance(amt, `${network.toUpperCase()} Airtime to ${phone}`, "Airtime");
      
      if (transactionId) {
        await updateDoc(doc(db, "transactions", transactionId), {
          status: "success",
          completedAt: serverTimestamp(),
        });
      }

      Alert.alert(
        "✅ Success", 
        `₦${amt.toLocaleString()} ${network.toUpperCase()} airtime sent to ${phone}`,
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
            }
          },
          {
            text: "Done",
            onPress: () => router.back(),
          }
        ]
      );

      setPhone("");
      setNetwork("");
      setAmount("");
    } catch (err: any) {
      console.error("Airtime error:", err);
      
      // Update transaction as failed if it exists
      if (transactionId) {
        await updateDoc(doc(db, "transactions", transactionId), {
          status: "failed",
          failureReason: err?.message || "Unknown error",
        }).catch(console.error);
      }
      
      Alert.alert("❌ Error", err?.message || "Failed to buy airtime");
    } finally {
      setLoading(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const canPurchase = phone.length === 11 && network && numAmount >= 50 && numAmount <= localBalance;

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
          headerTitle: "Buy Airtime",
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
        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Card.Content>
            <View style={styles.balanceContent}>
              <View>
                <Text style={styles.balanceLabel}>Wallet Balance</Text>
                <View style={styles.balanceRow}>
                  <FontAwesome5 name="wallet" size={20} color={BACKGROUND_COLOR} />
                  <Text style={styles.balanceAmount}>₦{localBalance.toLocaleString()}</Text>
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
              placeholder="08012345678"
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
                    onPress={() => setNetwork(n)}
                    style={[
                      styles.networkCard,
                      isSelected && styles.networkCardSelected,
                    ]}
                  >
                    <View style={[
                      styles.networkIconContainer,
                      { backgroundColor: NETWORK_COLORS[n] + "20" }
                    ]}>
                      <Image
                        source={NETWORK_ICONS[n]}
                        style={{ width: 28, height: 28, resizeMode: "contain" }}
                      />
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

        {/* Amount Input */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionLabel}>💰 Enter Amount</Text>
            <TextInput
              mode="outlined"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount (Min: ₦50)"
              style={styles.input}
              left={<TextInput.Icon icon="currency-ngn" />}
              right={
                numAmount > 0 ? (
                  numAmount > localBalance ? (
                    <TextInput.Icon icon="alert-circle" color={ERROR_COLOR} />
                  ) : (
                    <TextInput.Icon icon="check-circle" color={SUCCESS_COLOR} />
                  )
                ) : null
              }
            />
            {numAmount > 0 && numAmount < 50 && (
              <Text style={styles.errorText}>Minimum amount is ₦50</Text>
            )}
            {numAmount > localBalance && (
              <Text style={styles.errorText}>Insufficient balance</Text>
            )}

            {/* Quick Amount Buttons */}
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
                      ₦{amt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Purchase Summary */}
        {canPurchase && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.summaryTitle}>📋 Purchase Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Recipient:</Text>
                <Text style={styles.summaryValue}>{phone}</Text>
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
                  ₦{numAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Balance After:</Text>
                <Text style={[styles.summaryValue, { color: SUCCESS_COLOR, fontWeight: "bold" }]}>
                  ₦{(localBalance - numAmount).toLocaleString()}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Buy Button */}
        <Button
          mode="contained"
          onPress={handleSecureBuy}
          disabled={loading || !canPurchase}
          loading={loading}
          style={styles.buyButton}
          contentStyle={styles.buyButtonContent}
          icon="shopping"
        >
          {loading ? "Processing..." : "Buy Airtime"}
        </Button>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <FontAwesome5 name="shield-alt" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.infoText}>Secured with PIN verification</Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome5 name="bolt" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.infoText}>Instant delivery to recipient</Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome5 name="check-circle" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.infoText}>Transaction history recorded</Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome5 name="receipt" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.infoText}>Receipt available after purchase</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={{ height: 40 }} />

        {/* PIN Dialog */}
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
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  balanceCard: {
    marginHorizontal: 16,
    marginTop: 16,
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
    gap: 8,
  },
  networkCard: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  networkCardSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: ACCENT_COLOR,
  },
  networkIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  networkName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
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
  quickAmountsContainer: {
    marginTop: 16,
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
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
  },
  buyButtonContent: {
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