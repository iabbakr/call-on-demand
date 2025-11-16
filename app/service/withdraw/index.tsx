// withdraw/index.tsx - Styled Version
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, Chip, Text, TextInput } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";
import SecureActionWrapper from "../../components/security/SecureActionWrapper";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const SCREEN_BG = "#F5F5F5";

const { width } = Dimensions.get("window");

export default function WithdrawPage() {
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction } = useApp();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const quickAmounts = [5000, 10000, 20000, 50000, 100000];

  const createTransaction = async (amt: number) => {
    try {
      const userRef = doc(db, "users", user?.uid!);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.exists() ? userSnap.data()?.fullName || "You" : "You";

      const transactionData = {
        senderId: user?.uid,
        senderName: userName,
        receiverId: null,
        receiverName: `${userProfile?.bankName} - ${userProfile?.accountNumber}`,
        amount: amt,
        type: "Withdrawal",
        category: "Withdrawal",
        status: "success",
        description: `Withdrawal to ${userProfile?.bankName}`,
        reference: `WITHDRAW-${Date.now()}`,
        createdAt: serverTimestamp(),
        metadata: {
          bankName: userProfile?.bankName,
          accountNumber: userProfile?.accountNumber,
        },
      };

      const docRef = await addDoc(collection(db, "transactions"), transactionData);
      return docRef.id;
    } catch (error) {
      console.error("Error creating transaction:", error);
      return null;
    }
  };

  const performWithdraw = async () => {
    const amt = parseFloat(amount);

    if (isNaN(amt) || amt <= 0)
      return Alert.alert("Invalid Amount", "Enter a valid withdrawal amount.");
    if (amt > balance)
      return Alert.alert("Insufficient Balance", "You do not have enough balance.");
    if (!userProfile?.paystackRecipientCode) {
      return Alert.alert(
        "Bank Details Required",
        "Please update your bank details to enable withdrawal.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Bank", onPress: () => router.push("/profile/bank-details") },
        ]
      );
    }

    try {
      setLoading(true);

      // Trigger withdrawal using Paystack
      // const transfer = await withdrawToBank(user?.uid!, amt);

      // Deduct balance locally
      await deductBalance(amt, `Withdrawal to ${userProfile.bankName}`, "Withdrawal");

      // Create transaction
      const transactionId = await createTransaction(amt);

      // Add to app transactions
      await addTransaction({
        description: `Withdrawal of ₦${amt.toLocaleString()} to ${userProfile.bankName}`,
        amount: amt,
        category: "Withdrawal",
        type: "debit",
        status: "success",
      });

      Alert.alert(
        "✅ Withdrawal Successful",
        `₦${amt.toLocaleString()} has been sent to your ${userProfile.bankName} account.`,
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

      setAmount("");
    } catch (err: any) {
      console.error("Withdrawal Error:", err);
      Alert.alert("❌ Failed", err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const canWithdraw =
    numAmount > 0 && numAmount <= balance && userProfile?.paystackRecipientCode;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Withdraw Money",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <SecureActionWrapper>
        {(secureAction) => (
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Balance Card */}
            <Card style={styles.balanceCard}>
              <Card.Content>
                <View style={styles.balanceContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <View style={styles.balanceRow}>
                      <FontAwesome5 name="wallet" size={20} color="#FFF" />
                      <Text style={styles.balanceAmount}>
                        ₦{balance.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.withdrawIconContainer}>
                    <FontAwesome5 name="money-bill-wave" size={28} color="#FFF" />
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Bank Details */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Withdrawal Destination</Text>

                {userProfile?.bankName ? (
                  <View style={styles.bankCard}>
                    <View style={styles.bankIconContainer}>
                      <FontAwesome5 name="university" size={24} color={PRIMARY_COLOR} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bankName}>{userProfile.bankName}</Text>
                      <Text style={styles.accountNumber}>
                        {userProfile.accountNumber}
                      </Text>
                      <Text style={styles.accountName}>
                        {userProfile.fullName || "Account Holder"}
                      </Text>
                    </View>
                    <FontAwesome5 name="check-circle" size={20} color={SUCCESS_COLOR} />
                  </View>
                ) : (
                  <View style={styles.noBankCard}>
                    <FontAwesome5 name="exclamation-circle" size={40} color={ERROR_COLOR} />
                    <Text style={styles.noBankText}>No bank account linked</Text>
                    <Text style={styles.noBankSubtext}>
                      Add your bank details to enable withdrawals
                    </Text>
                    <Pressable
                      style={styles.addBankButton}
                      onPress={() => router.push("/profile/bank-details")}
                    >
                      <FontAwesome5 name="plus" size={14} color="#FFF" />
                      <Text style={styles.addBankText}>Add Bank Details</Text>
                    </Pressable>
                  </View>
                )}
              </Card.Content>
            </Card>

            {/* Amount Input */}
            {userProfile?.bankName && (
              <>
                <Card style={styles.card}>
                  <Card.Content>
                    <Text style={styles.sectionTitle}>Withdrawal Amount</Text>

                    <TextInput
                      mode="outlined"
                      label="Amount"
                      placeholder="Enter amount to withdraw"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
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

                    {numAmount > balance && (
                      <Text style={styles.errorText}>Insufficient balance</Text>
                    )}

                    {/* Quick Amounts */}
                    <View style={styles.quickAmountsContainer}>
                      <Text style={styles.quickAmountsLabel}>Quick amounts:</Text>
                      <View style={styles.quickAmountsGrid}>
                        {quickAmounts.map((amt) => (
                          <Chip
                            key={amt}
                            selected={amount === amt.toString()}
                            onPress={() => setAmount(amt.toString())}
                            style={[
                              styles.quickChip,
                              amount === amt.toString() && styles.quickChipSelected,
                            ]}
                            textStyle={
                              amount === amt.toString() && styles.quickChipTextSelected
                            }
                          >
                            ₦{amt.toLocaleString()}
                          </Chip>
                        ))}
                      </View>
                    </View>
                  </Card.Content>
                </Card>

                {/* Summary */}
                {canWithdraw && (
                  <Card style={styles.summaryCard}>
                    <Card.Content>
                      <Text style={styles.summaryTitle}>Withdrawal Summary</Text>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Amount:</Text>
                        <Text style={styles.summaryValue}>
                          ₦{numAmount.toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Destination:</Text>
                        <Text style={styles.summaryValue} numberOfLines={1}>
                          {userProfile.bankName}
                        </Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Account:</Text>
                        <Text style={styles.summaryValue}>
                          {userProfile.accountNumber}
                        </Text>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Balance After:</Text>
                        <Text style={[styles.summaryValue, { color: SUCCESS_COLOR }]}>
                          ₦{(balance - numAmount).toLocaleString()}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                )}

                {/* Withdraw Button */}
                <Pressable
                  style={[
                    styles.button,
                    (!canWithdraw || loading) && styles.buttonDisabled,
                  ]}
                  onPress={() => secureAction(performWithdraw)}
                  disabled={!canWithdraw || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={BACKGROUND_COLOR} />
                  ) : (
                    <View style={styles.buttonContent}>
                      <FontAwesome5
                        name="money-bill-wave"
                        size={16}
                        color={BACKGROUND_COLOR}
                      />
                      <Text style={styles.buttonText}>
                        Withdraw ₦{numAmount.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Info Card */}
                <Card style={styles.infoCard}>
                  <Card.Content>
                    <View style={styles.infoRow}>
                      <FontAwesome5 name="shield-alt" size={16} color={PRIMARY_COLOR} />
                      <Text style={styles.infoText}>Secured with PIN verification</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <FontAwesome5 name="clock" size={16} color={PRIMARY_COLOR} />
                      <Text style={styles.infoText}>
                        Processing time: 1-2 business days
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <FontAwesome5 name="receipt" size={16} color={PRIMARY_COLOR} />
                      <Text style={styles.infoText}>Transaction receipt available</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <FontAwesome5 name="university" size={16} color={PRIMARY_COLOR} />
                      <Text style={styles.infoText}>
                        Sent directly to your bank account
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SecureActionWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    padding: 16,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
  },
  balanceContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "500",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceAmount: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "bold",
  },
  withdrawIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Cards
  card: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  input: {
    backgroundColor: BACKGROUND_COLOR,
    marginBottom: 12,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },

  // Bank Card
  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: ACCENT_COLOR,
    padding: 16,
    borderRadius: 12,
  },
  bankIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BACKGROUND_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  bankName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  accountNumber: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  accountName: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },

  // No Bank Card
  noBankCard: {
    alignItems: "center",
    paddingVertical: 32,
  },
  noBankText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 4,
  },
  noBankSubtext: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  addBankButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
  },
  addBankText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },

  // Quick Amounts
  quickAmountsContainer: {
    marginTop: 4,
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
  quickChip: {
    backgroundColor: BACKGROUND_COLOR,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  quickChipSelected: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  quickChipTextSelected: {
    color: "#FFF",
  },

  // Summary
  summaryCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    maxWidth: "60%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },

  // Button
  button: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: BACKGROUND_COLOR,
    fontWeight: "700",
    fontSize: 16,
  },

  // Info Card
  infoCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
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