import Constants from "expo-constants";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import Paystack from "react-native-paystack-webview"; // FIXED
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

export default function AddFundsScreen() {
  const { user } = useAuth();
  const { refreshBalance } = useApp();

  const [amount, setAmount] = useState("1000");

  const paystackPublicKey = Constants.expoConfig?.extra?.PAYSTACK_PUBLIC_KEY;
  if (!paystackPublicKey) console.warn("Paystack public key not configured!");

  const handleSuccess = (reference: string) => {
    Alert.alert("Success", "Payment completed! Reference: " + reference);
    if (refreshBalance) refreshBalance();
    setAmount("1000");
  };

  const handleCancel = () => {
    Alert.alert("Cancelled", "Payment was cancelled.");
  };

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount < 50) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Invalid amount. Minimum 50₦</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Coins</Text>

      <TextInput
        label="Amount (₦)"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={styles.input}
      />

      <Paystack
        paystackKey={paystackPublicKey!}
        amount={numericAmount * 100} // convert to kobo
        billingEmail={user?.email || "test@example.com"}
        activityIndicatorColor="green"
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />

      <Text style={styles.tip}>
        Tip: Frontend-only payments work safely with Paystack public key. No secret key is exposed.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F5F5F5" },
  title: { fontWeight: "700", color: PRIMARY_COLOR, fontSize: 18, marginBottom: 16 },
  input: { backgroundColor: BACKGROUND_COLOR, marginBottom: 16 },
  tip: { marginTop: 12, fontSize: 12, color: "#666" },
});
