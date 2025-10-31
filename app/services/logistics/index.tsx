import { Stack } from "expo-router";
import {
  DocumentData,
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  IconButton,
  Text,
  TextInput,
} from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";

type LogisticsService = {
  id: string;
  name: string;
  provider?: string;
  category: string;
  state: string;
  city?: string;
  address?: string;
  phone?: string;
  price: number;
  weightBracket?: string;
  rating?: number;
  description?: string;
  tags?: string[];
  thumbnail?: string;
};

export default function Logistics() {
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, refreshBalance } =
    useApp();

  const [items, setItems] = useState<LogisticsService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Admin form state
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState("");
  const [weightBracket, setWeightBracket] = useState("");
  const [description, setDescription] = useState("");

  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    if (userProfile?.location) setFilterState(userProfile.location);
  }, [userProfile?.location]);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "services"), where("category", "==", "logistics"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as DocumentData) } as LogisticsService)
        );
        setItems(arr);
        setLoading(false);
      },
      (err) => {
        console.error("logistics snapshot error", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let out = items;
    if (filterState)
      out = out.filter(
        (i) => (i.state || "").toLowerCase() === filterState.toLowerCase()
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.provider || "").toLowerCase().includes(q) ||
          (i.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    out = out.sort(
      (a, b) => a.price - b.price || (b.rating ?? 0) - (a.rating ?? 0)
    );
    return out;
  }, [items, filterState, search]);

  const onBook = async (svc: LogisticsService) => {
    try {
      if (!user) return Alert.alert("Sign in required", "Please sign in to arrange logistics.");
      if (!svc.price || svc.price <= 0)
        return Alert.alert("Invalid price", "This service has no price set.");
      if (balance < svc.price)
        return Alert.alert("Insufficient balance", "Top up your wallet to proceed.");

      Alert.alert(
        "Confirm Logistics Booking",
        `Book "${svc.name}" for ₦${svc.price.toLocaleString()}${svc.weightBracket ? ` · ${svc.weightBracket}` : ""}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: async () => {
              try {
                await deductBalance(svc.price, `Logistics: ${svc.name}`, "logistics");
                await addTransaction({
                  description: `Logistics: ${svc.name}`,
                  amount: svc.price,
                  category: "logistics",
                  type: "debit",
                  status: "success",
                });

                await addDoc(collection(db, "notifications"), {
                  title: "New Logistics Booking",
                  message: `${user?.email ?? "A user"} booked ${svc.name} (${svc.state}) for ₦${svc.price}`,
                  serviceId: svc.id,
                  userId: user?.uid ?? null,
                  createdAt: new Date().toISOString(),
                  read: false,
                });

                Alert.alert("Booked", `Your logistics booking with ${svc.name} has been placed.`);
                await refreshBalance();
              } catch (err: any) {
                console.error("booking error", err);
                Alert.alert("Booking failed", err?.message || "Could not complete booking.");
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not initiate booking.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBalance();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddService = async () => {
    if (!name || !state || !price || !phone)
      return Alert.alert("Missing fields", "Please fill required fields.");

    try {
      await addDoc(collection(db, "services"), {
        name,
        provider,
        category: "logistics",
        state,
        city,
        address,
        phone,
        price: parseFloat(price),
        weightBracket,
        description,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Logistics service added successfully.");
      setName("");
      setProvider("");
      setState("");
      setCity("");
      setAddress("");
      setPhone("");
      setPrice("");
      setWeightBracket("");
      setDescription("");
    } catch (err: any) {
      console.error("add logistics error", err);
      Alert.alert("Error", err.message || "Failed to add logistics service.");
    }
  };

  const renderItem = ({ item }: { item: LogisticsService }) => (
    <Card style={styles.card}>
      <View style={{ flexDirection: "row", padding: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.city ? `${item.city}, ` : ""}
            {item.state} {item.weightBracket ? `• ${item.weightBracket}` : ""} • ₦
            {item.price?.toLocaleString()}
          </Text>
          {item.phone && <Text style={styles.desc}>📞 {item.phone}</Text>}
          <Text numberOfLines={2} style={styles.desc}>
            {item.description || item.address}
          </Text>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}
          >
            <Button compact mode="contained" onPress={() => onBook(item)}>
              Book
            </Button>
            <Text style={styles.rating}>⭐ {item.rating ?? "—"}</Text>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, headerTitle: "Logistics" }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Logistics</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text>Wallet: ₦{balance.toLocaleString()}</Text>
            <IconButton icon="refresh" onPress={() => refreshBalance()} size={20} />
          </View>
        </View>

        <TextInput
          placeholder="Search logistics provider, tag or weight..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilterState(userProfile?.location ?? null)}
          >
            <Text
              style={[
                styles.filterBtn,
                filterState === userProfile?.location && styles.filterActive,
              ]}
            >
              {userProfile?.location ?? "Your state"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterState(null)}>
            <Text
              style={[styles.filterBtn, !filterState && styles.filterActive]}
            >
              All
            </Text>
          </TouchableOpacity>
        </View>

        {isAdmin && (
          <>
            <Text style={{ fontWeight: "bold", marginTop: 20 }}>
              ➕ Add Logistics Service
            </Text>
            <TextInput label="Service Name" value={name} onChangeText={setName} />
            <TextInput label="Provider" value={provider} onChangeText={setProvider} />
            <TextInput label="State" value={state} onChangeText={setState} />
            <TextInput label="City" value={city} onChangeText={setCity} />
            <TextInput label="Address" value={address} onChangeText={setAddress} />
            <TextInput
              label="Phone Number"
              value={phone}
              keyboardType="phone-pad"
              onChangeText={setPhone}
            />
            <TextInput
              label="Price"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <TextInput
              label="Weight Bracket"
              value={weightBracket}
              onChangeText={setWeightBracket}
            />
            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <Button
              mode="contained"
              onPress={handleAddService}
              style={{ marginTop: 8 }}
            >
              Add Service
            </Button>
          </>
        )}

        {loading ? (
          <ActivityIndicator animating style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            scrollEnabled={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={{ padding: 20 }}>
                <Text>No logistics services found.</Text>
              </View>
            }
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#6200EE" },
  search: { marginVertical: 8, backgroundColor: "#fff" },
  filterRow: { flexDirection: "row", marginBottom: 8 },
  filterBtn: { marginRight: 8, padding: 8, borderRadius: 6 },
  filterActive: { backgroundColor: "#E8DEF8" },
  card: { marginVertical: 6 },
  name: { fontWeight: "700", fontSize: 16 },
  meta: { color: "#666", marginTop: 4 },
  desc: { color: "#444", marginTop: 6 },
  rating: { alignSelf: "center" },
});
