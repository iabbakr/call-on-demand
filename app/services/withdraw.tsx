import { FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";
const INACTIVE_COLOR = "#757575";

export default function WithdrawPage() {
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction } = useApp();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return Alert.alert("Invalid", "Enter a valid amount.");
    if (amt > balance) return Alert.alert("Insufficient", "Insufficient balance.");
    if (!userProfile?.bankName || !userProfile.accountNumber)
      return Alert.alert("Missing Bank Info", "Please update your bank details first.");

    try {
      setLoading(true);
      // 🔹 Deduct locally
      await deductBalance(amt, `Withdrawal to ${userProfile.bankName}`, "Withdrawal");
      await addTransaction({
        description: `Withdrawal of ₦${amt} to ${userProfile.bankName}`,
        amount: amt,
        category: "Withdrawal",
        type: "debit",
        status: "pending",
      });
      Alert.alert("Request Sent", "Your withdrawal request is being processed.");
      setAmount("");
      router.back();
    } catch (err: any) {
      console.error("Withdraw Error:", err);
      Alert.alert("Error", err?.message || "Failed to withdraw");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Withdraw Funds</Text>

      <View style={styles.balanceCard}>
        <Text style={{ color: BACKGROUND_COLOR, fontSize: 12 }}>Your Balance</Text>
        <Text style={{ color: BACKGROUND_COLOR, fontSize: 20, fontWeight: "700" }}>
          <FontAwesome5 name="coins" size={16} color={BACKGROUND_COLOR} /> {balance.toLocaleString()}
        </Text>
      </View>

      <View style={styles.form}>
        <Text>Amount</Text>
        <TextInput
          mode="outlined"
          keyboardType="numeric"
          placeholder="₦1000"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />

        <Text style={{ marginTop: 8 }}>Bank</Text>
        <View style={styles.bankInfo}>
          <Text style={{ color: INACTIVE_COLOR }}>
            {userProfile?.bankName || "No bank info"} ({userProfile?.accountNumber || "N/A"})
          </Text>
        </View>

        <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleWithdraw} disabled={loading}>
          {loading ? <ActivityIndicator color={BACKGROUND_COLOR} /> : <Text style={styles.buttonText}>Withdraw</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: HEADER_BG },
  header: { fontSize: 18, fontWeight: "700", color: PRIMARY_COLOR, marginBottom: 16 },
  balanceCard: { backgroundColor: PRIMARY_COLOR, borderRadius: 8, padding: 16, marginBottom: 16 },
  form: { backgroundColor: BACKGROUND_COLOR, padding: 12, borderRadius: 8 },
  input: { marginTop: 6, backgroundColor: BACKGROUND_COLOR },
  bankInfo: { backgroundColor: HEADER_BG, padding: 10, borderRadius: 8, marginTop: 6 },
  button: { marginTop: 16, backgroundColor: PRIMARY_COLOR, padding: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: BACKGROUND_COLOR, fontWeight: "700" },
});
