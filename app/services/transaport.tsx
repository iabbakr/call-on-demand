// services/transports.tsx
import { Stack } from "expo-router";
import { collection, DocumentData, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, IconButton, Text, TextInput } from "react-native-paper";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

type Transport = {
  id: string;
  name: string;
  category: string;
  state: string;
  price: number; // estimated fare
  vehicleType?: string;
  provider?: string;
  rating?: number;
  description?: string;
};

export default function Transports() {
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, refreshBalance } = useApp();
  const [services, setServices] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";
const INACTIVE_COLOR = "#757575";

  useEffect(() => { if (userProfile?.location) setFilterState(userProfile.location); }, [userProfile?.location]);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "services"), where("category", "==", "transport"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) } as Transport));
      setServices(items);
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = services;
    if (filterState) list = list.filter((s) => (s.state || "").toLowerCase() === filterState.toLowerCase());
    if (search.trim()) list = list.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.provider || "").toLowerCase().includes(search.toLowerCase()));
    // prefer cheaper transports first, then higher rating
    list = list.sort((a,b) => a.price - b.price || (b.rating ?? 0) - (a.rating ?? 0));
    return list;
  }, [services, filterState, search]);

  const book = async (svc: Transport) => {
    try {
      if (!user) return Alert.alert("Please sign in", "Sign in to book transport.");
      if (balance < svc.price) return Alert.alert("Insufficient balance", "Top up your wallet.");
      await deductBalance(svc.price, `Transport: ${svc.name}`, "transport");
      await addTransaction({
        description: `Transport: ${svc.name}`,
        amount: svc.price,
        category: "transport",
        type: "debit",
        status: "success",
      });
      Alert.alert("Booked", `Your ${svc.name} booking is confirmed.`);
      await refreshBalance();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Booking failed", err?.message || "Try again");
    }
  };

  const onRefresh = async () => { setRefreshing(true); try { await refreshBalance(); } finally { setRefreshing(false); } };

  const renderItem = ({ item }: { item: Transport }) => (
    <Card style={styles.card}>
      <View style={{ padding: 8 }}>
        <Text style={styles.name}>{item.name} {item.vehicleType ? `· ${item.vehicleType}` : ""}</Text>
        <Text style={styles.meta}>{item.state} • ₦{item.price?.toLocaleString()}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
          <Button compact mode="contained" onPress={() => book(item)}>Book</Button>
          <Text>⭐ {item.rating ?? "—"}</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <>
    <Stack.Screen options={{ 
      headerShown: true,
      headerTitle: "Transport",
     }} />
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transport</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text>Wallet: ₦{balance.toLocaleString()}</Text>
          <IconButton icon="refresh" onPress={() => refreshBalance()} size={20} />
        </View>
      </View>

      <TextInput placeholder="Search transport or provider..." value={search} onChangeText={setSearch} style={styles.search} />

      <View style={styles.filterRow}>
        <TouchableOpacity onPress={() => setFilterState(userProfile?.location ?? null)}>
          <Text style={[styles.filterBtn, filterState === userProfile?.location && styles.filterActive]}>{userProfile?.location ?? "Your state"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilterState(null)}>
          <Text style={[styles.filterBtn, !filterState && styles.filterActive]}>All</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator animating /> : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={{ padding: 20 }}><Text>No transport services found.</Text></View>}
        />
      )}
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#6200EE" },
  search: { marginVertical: 8, backgroundColor: "#fff" },
  filterRow: { flexDirection: "row", marginBottom: 8 },
  filterBtn: { marginRight: 8, padding: 8, borderRadius: 6 },
  filterActive: { backgroundColor: "#E8DEF8" },
  card: { marginVertical: 6 },
  name: { fontWeight: "700" },
  meta: { color: "#666", marginTop: 4 },
});
