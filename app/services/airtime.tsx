// /app/services/airtime.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, ActivityIndicator, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { TextInput } from "react-native-paper";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

export default function AirtimePage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInitialLoading(false);
      return;
    }
    const fetchUser = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;
          setBalance(data.balance || 0);
        }
      } catch (err) {
        console.error("fetch user balance:", err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchUser();
  }, [user]);

  const handleBuy = async () => {
    setLoading(true);
    try {
      // Validation
      if (!/^\d{11}$/.test(phone)) {
        Alert.alert("Invalid", "Please enter a valid 11-digit phone number.");
        return;
      }
      if (!network) {
        Alert.alert("Invalid", "Please select a network.");
        return;
      }
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt < 50) {
        Alert.alert("Invalid", "Enter a valid amount (min 50).");
        return;
      }
      if (amt > balance) {
        Alert.alert("Insufficient", "You have insufficient balance.");
        return;
      }

      const airtimeServiceID = network === "9mobile" ? "etisalat" : network;

      const res = await fetch("/api/vtpass/airtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceID: airtimeServiceID, amount: amt, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || data?.response_description || "Airtime purchase failed");
      }

      // Backend success shape expected: { code: '000', ... } or ok HTTP 200
      if (data?.code && data.code !== "000") {
        throw new Error(data.response_description || "Transaction failed");
      }

      // Deduct local balance
      if (user) {
        const ref = doc(db, "users", user.uid);
        await updateDoc(ref, { balance: (balance - amt) });
        setBalance(prev => prev - amt);
      }

      Alert.alert("Success", `Airtime purchase successful for ${phone}.`);
      setPhone("");
      setNetwork("");
      setAmount("");
      router.back();
    } catch (err: any) {
      console.error("Airtime error:", err);
      Alert.alert("Error", err.message || "Failed to buy airtime");
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
        <Text style={{ fontWeight: "700", color: PRIMARY_COLOR, fontSize: 18 }}>Buy Airtime</Text>
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

      <View style={styles.form}>
        <Text>Phone Number</Text>
        <TextInput
          mode="outlined"
          keyboardType="phone-pad"
          placeholder="08012345678"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
        />

        <Text style={{ marginTop: 8 }}>Network</Text>
        {/* lightweight select */}
        <View style={styles.selectRow}>
          {["mtn", "glo", "airtel", "9mobile"].map((n) => (
            <Pressable
              key={n}
              onPress={() => setNetwork(n)}
              style={[
                styles.networkItem,
                network === n && { borderColor: PRIMARY_COLOR, borderWidth: 1 },
              ]}
            >
              <Text style={{ color: INACTIVE_COLOR, textTransform: "uppercase" }}>{n}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ marginTop: 8 }}>Amount</Text>
        <TextInput
          mode="outlined"
          keyboardType="numeric"
          placeholder="e.g., 1000"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />

        <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleBuy} disabled={loading}>
          {loading ? <ActivityIndicator color={BACKGROUND_COLOR} /> : <Text style={styles.buttonText}>Buy Airtime</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: HEADER_BG },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  balanceCard: { backgroundColor: PRIMARY_COLOR, borderRadius: 8, padding: 16, marginBottom: 16 },
  form: { backgroundColor: BACKGROUND_COLOR, padding: 12, borderRadius: 8 },
  input: { marginTop: 6, backgroundColor: BACKGROUND_COLOR },
  selectRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  networkItem: { flex: 1, padding: 10, marginHorizontal: 4, backgroundColor: HEADER_BG, borderRadius: 8, alignItems: "center" },
  button: { marginTop: 16, backgroundColor: PRIMARY_COLOR, padding: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: BACKGROUND_COLOR, fontWeight: "700" },
});
