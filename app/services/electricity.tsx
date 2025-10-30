import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, ActivityIndicator, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { TextInput } from "react-native-paper";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useApp } from "../../context/AppContext";
import { buyElectricity, verifyMeter } from "../../lib/api";
import axios from "axios";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";
const INACTIVE_COLOR = "#757575";

const discos = [
  { id: "ikeja-electric", name: "Ikeja Electric (IKEDC)" },
  { id: "eko-electric", name: "Eko Electric (EKEDC)" },
  { id: "abuja-electric", name: "Abuja Electric (AEDC)" },
  { id: "kano-electric", name: "Kano Electric (KEDCO)" },
];

export default function ElectricityPage() {
  const { user } = useAuth();
  const { balance: globalBalance, deductBalance, addTransaction } = useApp();
  const [balance, setBalance] = useState<number>(0);
  const [disco, setDisco] = useState("");
  const [meter, setMeter] = useState("");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [amount, setAmount] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    try {
      const resp = await verifyMeter(disco, meter); // cloud callable
      if (resp?.success && resp.content?.Customer_Name) {
        setCustomerName(resp.content.Customer_Name);
        Alert.alert("Verified", `Meter belongs to ${resp.content.Customer_Name}`);
      } else {
        throw new Error(resp?.message || "Could not verify meter");
      }
    } catch (err: any) {
      console.error("verify:", err);
      Alert.alert("Error", err?.message || "Failed verification");
    } finally {
      setVerifying(false);
    }
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      const amt = parseFloat(amount);
      if (!disco || !meter) throw new Error("Disco and meter required");
      if (!customerName) throw new Error("Verify meter first");
      if (isNaN(amt) || amt < 100) throw new Error("Enter an amount >= 100");
      if (amt > balance) throw new Error("Insufficient balance");

      const res = await buyElectricity({
        serviceID: disco,
        billersCode: meter,
        variation_code: meterType,
        amount: amt,
        phone: (user?.phoneNumber || user?.email) || "08011111111",
      });

      if (!res || !res.success) throw new Error("Electricity purchase failed");
      const vt = res.vtpass || res;
      if (vt?.code && vt.code !== "000") throw new Error(vt.response_description || "Transaction failed");

      await deductBalance(amt, `Electricity ${disco} - ${meter}`, "Electricity");
      await addTransaction({ description: `Electricity payment ${meter}`, amount: amt, type: "debit", category: "Electricity", status: "success" });

      Alert.alert("Success", `Electricity purchase successful. Check token or meter.`);
      setDisco("");
      setMeter("");
      setCustomerName(null);
      setAmount("");
      router.back();
    } catch (err: any) {
      console.error("electricity:", err);
      Alert.alert("Error", err?.message || "Could not pay");
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
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={PRIMARY_COLOR} />
        </Pressable>
        <Text style={{ fontWeight: "700", color: PRIMARY_COLOR, fontSize: 18 }}>Electricity</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.balanceCard}>
        <View>
          <Text style={{ color: BACKGROUND_COLOR, fontSize: 12 }}>Your wallet balance</Text>
          <Text style={{ color: BACKGROUND_COLOR, fontSize: 20, fontWeight: "700" }}>
            <FontAwesome5 name="coins" size={16} color={BACKGROUND_COLOR} /> {balance.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: BACKGROUND_COLOR, padding: 12, borderRadius: 8 }}>
        <Text>Disco</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
          {discos.map(d => (
            <Pressable key={d.id} onPress={() => setDisco(d.id)} style={[styles.networkItem, disco === d.id && { borderColor: PRIMARY_COLOR, borderWidth: 1 }]}>
              <Text style={{ color: INACTIVE_COLOR }}>{d.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ marginTop: 8 }}>Meter Number</Text>
        <TextInput mode="outlined" keyboardType="numeric" value={meter} onChangeText={setMeter} style={{ marginTop: 6 }} />

        <Text style={{ marginTop: 8 }}>Meter Type</Text>
        <View style={{ flexDirection: "row", marginTop: 6 }}>
          <Pressable onPress={() => setMeterType("prepaid")} style={[styles.smallBtn, meterType === "prepaid" && { borderColor: PRIMARY_COLOR, borderWidth: 1 }]}>
            <Text>Prepaid</Text>
          </Pressable>
          <Pressable onPress={() => setMeterType("postpaid")} style={[styles.smallBtn, meterType === "postpaid" && { borderColor: PRIMARY_COLOR, borderWidth: 1 }]}>
            <Text>Postpaid</Text>
          </Pressable>
          <Pressable onPress={handleVerify} style={[styles.verifyBtn, verifying && { opacity: 0.7 }]}>
            {verifying ? <ActivityIndicator /> : <Text style={{ color: BACKGROUND_COLOR }}>Verify</Text>}
          </Pressable>
        </View>

        {customerName && <Text style={{ marginTop: 8, fontWeight: "700" }}>Customer: {customerName}</Text>}

        <Text style={{ marginTop: 8 }}>Amount</Text>
        <TextInput mode="outlined" keyboardType="numeric" value={amount} onChangeText={setAmount} style={{ marginTop: 6 }} />

        <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={handlePay} disabled={loading}>
          {loading ? <ActivityIndicator color={BACKGROUND_COLOR} /> : <Text style={styles.buttonText}>Pay Electricity</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F5F5F5" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  balanceCard: { backgroundColor: PRIMARY_COLOR, borderRadius: 8, padding: 16, marginBottom: 16 },
  networkItem: { padding: 10, margin: 4, backgroundColor: "#F5F5F5", borderRadius: 8 },
  smallBtn: { padding: 10, marginRight: 8, backgroundColor: "#F5F5F5", borderRadius: 8 },
  verifyBtn: { marginLeft: "auto", backgroundColor: PRIMARY_COLOR, padding: 10, borderRadius: 8 },
  button: { marginTop: 16, backgroundColor: PRIMARY_COLOR, padding: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: BACKGROUND_COLOR, fontWeight: "700" },
});
