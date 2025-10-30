import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { Text, TextInput } from "react-native-paper";
import * as WebBrowser from "expo-web-browser";
import { createPaystackTransaction, verifyPaystackAndCredit } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

export default function AddFundsScreen() {
  const { user } = useAuth();
  const { refreshBalance } = useApp();
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(false);

  const startPaystack = async () => {
    if (!user?.email) return Alert.alert("Email required", "Please add an email to your profile.");
    const numeric = Number(amount);
    if (isNaN(numeric) || numeric < 50) return Alert.alert("Invalid", "Enter a valid amount (min 50).");

    setLoading(true);
    try {
      const init = await createPaystackTransaction(numeric, user.email);
      if (!init || !init.success) throw new Error("Could not initialize payment");

      // Open the authorization URL in the system browser
      await WebBrowser.openBrowserAsync(init.authorization_url);

      // After user completes payment in browser, we must verify the reference.
      // Ask user to tap verify (or auto-verify after short delay).
      Alert.alert("Complete Payment", "After completing payment in the browser, tap Verify to credit your wallet.");

      // Immediately attempt verification (may fail if user hasn't completed)
      const verify = await verifyPaystackAndCredit(init.reference, numeric);
      if (verify?.success) {
        Alert.alert("Success", "Wallet credited successfully.");
        if (refreshBalance) refreshBalance();
      } else {
        Alert.alert("Info", "Payment not yet confirmed. You can try Verify later.");
      }
    } catch (err: any) {
      console.error("Paystack init error:", err);
      Alert.alert("Error", err?.message || "Failed to start payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={{ fontWeight: "700", color: PRIMARY_COLOR, fontSize: 18 }}>Add Coins</Text>
      <TextInput
        label="Amount (₦)"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={{ marginTop: 16, backgroundColor: BACKGROUND_COLOR }}
      />

      <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={startPaystack} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Pay with Paystack</Text>}
      </Pressable>

      <Text style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        Tip: For reliable, automatic crediting implement a Paystack webhook server-side and avoid manual verification.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F5F5F5" },
  button: { marginTop: 16, backgroundColor: PRIMARY_COLOR, padding: 12, borderRadius: 8, alignItems: "center" },
});
