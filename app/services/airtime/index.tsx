import { FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { useSecureAction } from "../../../hooks/useSecureAction";
import { buyAirtime } from "../../../lib/vtpass"; // <-- updated import
import PinDialog from "../../components/security/PinDialog";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const INACTIVE_COLOR = "#757575";

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

  const handleBuy = async () => {
    setLoading(true);
    try {
      if (!/^\d{11}$/.test(phone)) throw new Error("Enter a valid 11-digit phone number");
      if (!network) throw new Error("Select a network");
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt < 50) throw new Error("Amount must be at least 50 coins");
      if (amt > localBalance) throw new Error("Insufficient balance");

      const airtimeServiceID = network === "9mobile" ? "etisalat" : network;

      const res = await buyAirtime({ serviceID: airtimeServiceID, amount: amt, phone });
      if (!res || res.code !== "000") {
        throw new Error(res.response_description || "Transaction failed");
      }

      await deductBalance(amt, `Airtime to ${phone}`, "Airtime");
      await addTransaction({
        description: `Airtime purchase to ${phone}`,
        amount: amt,
        type: "debit",
        category: "Airtime",
        status: "success",
      });

      Alert.alert("Success", `Airtime purchase successful for ${phone}`);
      setPhone("");
      setNetwork("");
      setAmount("");
      router.back();
    } catch (err: any) {
      console.error("Airtime error:", err);
      Alert.alert("Error", err?.message || "Failed to buy airtime");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={{ fontWeight: "700", color: PRIMARY_COLOR, fontSize: 18 }}>Buy Airtime</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.balanceCard}>
        <View>
          <Text style={{ color: BACKGROUND_COLOR, fontSize: 12 }}>Your wallet balance</Text>
          <Text style={{ color: BACKGROUND_COLOR, fontSize: 20, fontWeight: "700" }}>
            <FontAwesome5 name="coins" size={16} color={BACKGROUND_COLOR} /> {localBalance.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text>Phone Number</Text>
        <TextInput mode="outlined" keyboardType="phone-pad" placeholder="08012345678" value={phone} onChangeText={setPhone} style={styles.input} />

        <Text style={{ marginTop: 8 }}>Network</Text>
        <View style={styles.selectRow}>
          {["mtn", "glo", "airtel", "9mobile"].map((n) => (
            <Pressable
              key={n}
              onPress={() => setNetwork(n)}
              style={[styles.networkItem, network === n && { borderColor: PRIMARY_COLOR, borderWidth: 1 }]}
            >
              <Text style={{ color: INACTIVE_COLOR, textTransform: "uppercase" }}>{n}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ marginTop: 8 }}>Amount</Text>
        <TextInput mode="outlined" keyboardType="numeric" placeholder="e.g., 1000" value={amount} onChangeText={setAmount} style={styles.input} />

        <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSecureBuy} disabled={loading}>
          {loading ? <ActivityIndicator color={BACKGROUND_COLOR} /> : <Text style={styles.buttonText}>Buy Airtime</Text>}
        </Pressable>
      </View>

      <PinDialog visible={showPinDialog} onClose={() => setShowPinDialog(false)} onSubmit={verifyPin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F5F5F5" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  balanceCard: { backgroundColor: PRIMARY_COLOR, borderRadius: 8, padding: 16, marginBottom: 16 },
  form: { backgroundColor: "#FFFFFF", padding: 12, borderRadius: 8 },
  input: { marginTop: 6, backgroundColor: "#FFFFFF" },
  selectRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  networkItem: { flex: 1, padding: 10, marginHorizontal: 4, backgroundColor: "#F5F5F5", borderRadius: 8, alignItems: "center" },
  button: { marginTop: 16, backgroundColor: PRIMARY_COLOR, padding: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: BACKGROUND_COLOR, fontWeight: "700" },
});
