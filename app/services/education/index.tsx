import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { buyEducation } from "../../../lib/api"; // ✅ Use existing API

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const INACTIVE_COLOR = "#757575";

const services = [
  { id: "jamb", name: "JAMB Pin" },
  { id: "waec", name: "WAEC Pin" },
  { id: "neco", name: "NECO Pin" },
];

export default function EducationPage() {
  const { user } = useAuth();
  const { balance: globalBalance, deductBalance, addTransaction } = useApp();
  const [balance, setBalance] = useState<number>(0);
  const [service, setService] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pricePerUnit, setPricePerUnit] = useState(500);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setBalance(globalBalance || 0);
    setInitialLoading(false);
  }, [globalBalance]);

  const handleBuy = async () => {
    setLoading(true);
    try {
      if (!service) throw new Error("Select an education service");
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty < 1) throw new Error("Enter a valid quantity");
      const total = qty * pricePerUnit;
      if (total > balance) throw new Error("Insufficient balance");

      const res = await buyEducation({
        serviceID: service,
        quantity: qty,
        amount: total,
        phone: user?.phoneNumber || "08011111111",
      });

      if (!res || !res.success) throw new Error(res.response_description || "Transaction failed");

      await deductBalance(total, `Purchased ${qty} ${service} pin(s)`, "Education");
      await addTransaction({
        description: `Education purchase ${service}`,
        amount: total,
        type: "debit",
        category: "Education",
        status: "success",
      });

      Alert.alert("Success", `Purchased ${qty} ${service.toUpperCase()} pin(s).`);
      setService("");
      setQuantity("1");
      router.back();
    } catch (err: any) {
      console.error("education:", err);
      Alert.alert("Error", err?.message || "Failed to purchase");
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

  const total = (parseInt(quantity || "0", 10) || 0) * pricePerUnit;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={PRIMARY_COLOR} />
        </Pressable>
        <Text style={{ fontWeight: "700", color: PRIMARY_COLOR, fontSize: 18 }}>Education</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.balanceCard}>
        <Text style={{ color: BACKGROUND_COLOR, fontSize: 12 }}>Your wallet balance</Text>
        <Text style={{ color: BACKGROUND_COLOR, fontSize: 20, fontWeight: "700" }}>
          <FontAwesome5 name="coins" size={16} color={BACKGROUND_COLOR} /> {balance.toLocaleString()}
        </Text>
      </View>

      <View style={styles.form}>
        <Text>Choose Service</Text>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          {services.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setService(s.id)}
              style={[styles.networkItem, service === s.id && { borderColor: PRIMARY_COLOR, borderWidth: 1 }]}
            >
              <Text style={{ color: INACTIVE_COLOR }}>{s.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ marginTop: 8 }}>Quantity</Text>
        <TextInput mode="outlined" keyboardType="numeric" value={quantity} onChangeText={setQuantity} style={{ marginTop: 6 }} />

        <Text style={{ marginTop: 8 }}>Price per unit</Text>
        <Text style={{ marginTop: 4, fontWeight: "700" }}>{pricePerUnit.toLocaleString()} coins</Text>

        <Text style={{ marginTop: 8 }}>Total: {total.toLocaleString()} coins</Text>

        <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleBuy} disabled={loading}>
          {loading ? <ActivityIndicator color={BACKGROUND_COLOR} /> : <Text style={styles.buttonText}>Purchase</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F5F5F5" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  balanceCard: { backgroundColor: PRIMARY_COLOR, borderRadius: 8, padding: 16, marginBottom: 16 },
  form: { backgroundColor: BACKGROUND_COLOR, padding: 12, borderRadius: 8 },
  networkItem: { padding: 10, marginRight: 8, backgroundColor: "#F5F5F5", borderRadius: 8 },
  button: { marginTop: 16, backgroundColor: PRIMARY_COLOR, padding: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: BACKGROUND_COLOR, fontWeight: "700" },
});
