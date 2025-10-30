import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { getDataPlans, buyData } from "../../lib/api";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";
const INACTIVE_COLOR = "#757575";

type DataPlan = { name: string; variation_code: string; variation_amount: string };

export default function DataPage() {
  const { user } = useAuth();
  const { balance: globalBalance, deductBalance, addTransaction } = useApp();
  const [balance, setBalance] = useState<number>(0);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("");
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setBalance(globalBalance || 0);
    setInitialLoading(false);
  }, [globalBalance]);

  const fetchPlans = async (svc: string) => {
    setPlansLoading(true);
    try {
      const serviceID = `${svc}-data`;
      const data = await getDataPlans(serviceID);
      // normalize server return: { success: true, plans: [...] }
      let list: DataPlan[] = [];
      if (data?.plans) list = data.plans;
      else if (Array.isArray(data)) list = data;
      else if (data?.content?.variations) list = data.content.variations;
      setPlans(list || []);
    } catch (err: any) {
      console.error("fetch plans:", err);
      Alert.alert("Error", err?.message || "Could not fetch plans");
    } finally {
      setPlansLoading(false);
    }
  };

  const handleFetchPlansForNetwork = (n: string) => {
    setNetwork(n);
    setSelectedPlan(null);
    setPlans([]);
    fetchPlans(n);
  };

  const handleBuy = async () => {
    setLoading(true);
    try {
      if (!/^\d{11}$/.test(phone)) throw new Error("Enter a valid 11-digit phone number");
      if (!network) throw new Error("Select network");
      if (!selectedPlan) throw new Error("Choose a data plan");
      const amt = parseFloat(selectedPlan.variation_amount);
      if (isNaN(amt) || amt <= 0) throw new Error("Invalid plan amount");
      if (amt > balance) throw new Error("Insufficient balance");

      const res = await buyData({
        serviceID: `${network}-data`,
        billersCode: phone,
        variation_code: selectedPlan.variation_code,
        amount: amt,
        phone,
      });

      if (!res || !res.success) throw new Error("Data purchase failed");
      const vt = res.vtpass || res;
      if (vt?.code && vt.code !== "000") throw new Error(vt.response_description || "Failed");

      await deductBalance(amt, `Data ${selectedPlan.name} to ${phone}`, "Data");
      await addTransaction({ description: `Data purchase ${selectedPlan.name}`, amount: amt, type: "debit", category: "Data", status: "success" });

      Alert.alert("Success", `You purchased ${selectedPlan.name} for ${phone}`);
      setPhone("");
      setNetwork("");
      setSelectedPlan(null);
      setPlans([]);
      router.back();
    } catch (err: any) {
      console.error("Data purchase:", err);
      Alert.alert("Error", err?.message || "Data purchase failed");
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
        <Text style={{ fontWeight: "700", color: PRIMARY_COLOR, fontSize: 18 }}>Buy Data</Text>
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
        <Text>Phone Number</Text>
        <TextInput mode="outlined" keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={{ marginTop: 6 }} />

        <Text style={{ marginTop: 8 }}>Network</Text>
        <View style={styles.selectRow}>
          {["mtn", "glo", "airtel", "9mobile"].map((n) => (
            <Pressable key={n} onPress={() => handleFetchPlansForNetwork(n)} style={[styles.networkItem, network === n && { borderColor: PRIMARY_COLOR, borderWidth: 1 }]}>
              <Text style={{ textTransform: "uppercase", color: INACTIVE_COLOR }}>{n}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ marginTop: 8 }}>Plans</Text>
        {plansLoading ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : (
          <FlatList
            data={plans}
            horizontal
            keyExtractor={(item, idx) => `${item.variation_code}-${idx}`}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedPlan(item)} style={[{ padding: 10, marginRight: 8, borderRadius: 8, backgroundColor: HEADER_BG }, selectedPlan?.variation_code === item.variation_code && { borderColor: PRIMARY_COLOR, borderWidth: 1 }]}>
                <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                <Text>{parseFloat(item.variation_amount).toLocaleString()} coins</Text>
              </Pressable>
            )}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        )}

        <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleBuy} disabled={loading}>
          {loading ? <ActivityIndicator color={BACKGROUND_COLOR} /> : <Text style={styles.buttonText}>Buy Data</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F5F5F5" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  balanceCard: { backgroundColor: PRIMARY_COLOR, borderRadius: 8, padding: 16, marginBottom: 16 },
  selectRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  networkItem: { flex: 1, padding: 10, marginHorizontal: 4, backgroundColor: "#F5F5F5", borderRadius: 8, alignItems: "center" },
  button: { marginTop: 16, backgroundColor: PRIMARY_COLOR, padding: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: BACKGROUND_COLOR, fontWeight: "700" },
});
