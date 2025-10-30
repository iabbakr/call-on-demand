// services/laundry.tsx
import { Stack } from "expo-router";
import {
  addDoc,
  collection,
  DocumentData,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
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
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

type Service = {
  id: string;
  name: string;
  category: string;
  state: string;
  city: string;
  address?: string;
  price: number;
  currency?: string;
  rating?: number;
  thumbnail?: string;
  description?: string;
  tags?: string[];
};

export default function LaundryServices() {
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, refreshBalance } = useApp();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Admin form states
  const [shopName, setShopName] = useState("");
  const [shopState, setShopState] = useState("");
  const [shopCity, setShopCity] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPrice, setShopPrice] = useState("");

  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    if (userProfile?.location) setFilterState(userProfile.location);
  }, [userProfile?.location]);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "services"), where("category", "==", "laundry"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as DocumentData) } as Service)
        );
        setServices(items);
        setLoading(false);
      },
      (err) => {
        console.error("services snapshot error", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // 🔍 Filter logic
  const filtered = useMemo(() => {
    let list = services;
    if (filterState)
      list = list.filter(
        (s) => (s.state || "").toLowerCase() === filterState.toLowerCase()
      );
    if (filterCity)
      list = list.filter(
        (s) => (s.city || "").toLowerCase() === filterCity.toLowerCase()
      );
    if (search.trim())
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.tags || []).some((t) =>
            t.toLowerCase().includes(search.toLowerCase())
          )
      );
    return list;
  }, [services, filterState, filterCity, search]);

  const uniqueStates = Array.from(new Set(services.map((s) => s.state)));
  const uniqueCities = Array.from(
    new Set(
      services
        .filter((s) => !filterState || s.state === filterState)
        .map((s) => s.city)
    )
  );

  const onBook = async (service: Service) => {
    try {
      if (!user) return Alert.alert("Auth required", "Please sign in to book a service.");
      if (!service.price || service.price <= 0)
        return Alert.alert("Invalid price", "This service has no price set.");
      if (balance < service.price) {
        return Alert.alert("Insufficient balance", "Top up your wallet to proceed.");
      }

      Alert.alert(
        "Confirm Booking",
        `Book ${service.name} for ₦${service.price.toLocaleString()}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: async () => {
              try {
                await deductBalance(service.price, `Booked ${service.name}`, "service");
                await addTransaction({
                  description: `Booked ${service.name}`,
                  amount: service.price,
                  category: "service",
                  type: "debit",
                  status: "success",
                });
                Alert.alert("Booked", `${service.name} booked successfully.`);
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

  const handleAddLaundry = async () => {
    if (!shopName || !shopState || !shopCity || !shopPrice)
      return Alert.alert("Missing fields", "Please fill all required fields.");

    try {
      await addDoc(collection(db, "services"), {
        name: shopName,
        category: "laundry",
        state: shopState,
        city: shopCity,
        address: shopAddress || "",
        price: parseFloat(shopPrice),
        createdAt: serverTimestamp(),
      });
      Alert.alert("Success", "Laundry shop added successfully.");
      setShopName("");
      setShopState("");
      setShopCity("");
      setShopAddress("");
      setShopPrice("");
    } catch (err: any) {
      console.error("add laundry error", err);
      Alert.alert("Error", err.message || "Failed to add laundry shop.");
    }
  };

  const renderItem = ({ item }: { item: Service }) => (
    <Card style={styles.card}>
      <View style={styles.cardRow}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={{ color: "#fff" }}>L</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.serviceTitle}>{item.name}</Text>
          <Text style={styles.serviceMeta}>
            {item.city}, {item.state} • ₦{item.price?.toLocaleString()}
          </Text>
          <Text numberOfLines={2} style={styles.serviceDesc}>
            {item.address}
          </Text>
          <View style={styles.cardActions}>
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
      <Stack.Screen options={{ headerShown: true, headerTitle: "Laundry" }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Laundry</Text>
          <View style={styles.balanceRow}>
            <Text>Wallet: ₦{balance.toLocaleString()}</Text>
            <IconButton icon="refresh" onPress={() => refreshBalance()} size={20} />
          </View>
        </View>

        <TextInput
          placeholder="Search laundry or tag..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        {/* 🧺 Filter section */}
        <View style={styles.filterRow}>
          <Text>State:</Text>
          {uniqueStates.map((st) => (
            <TouchableOpacity key={st} onPress={() => setFilterState(st)}>
              <Text
                style={[
                  styles.filterButton,
                  filterState === st && styles.filterActive,
                ]}
              >
                {st}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setFilterState(null)}>
            <Text style={styles.filterButton}>All</Text>
          </TouchableOpacity>
        </View>

        {filterState && (
          <View style={styles.filterRow}>
            <Text>City:</Text>
            {uniqueCities.map((ct) => (
              <TouchableOpacity key={ct} onPress={() => setFilterCity(ct)}>
                <Text
                  style={[
                    styles.filterButton,
                    filterCity === ct && styles.filterActive,
                  ]}
                >
                  {ct}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setFilterCity(null)}>
              <Text style={styles.filterButton}>All</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAdmin && (
          <>
            <Text style={{ fontWeight: "bold", marginTop: 20 }}>
              ➕ Add Laundry Shop
            </Text>
            <TextInput label="Name" value={shopName} onChangeText={setShopName} />
            <TextInput label="State" value={shopState} onChangeText={setShopState} />
            <TextInput label="City" value={shopCity} onChangeText={setShopCity} />
            <TextInput
              label="Address"
              value={shopAddress}
              onChangeText={setShopAddress}
            />
            <TextInput
              label="Price"
              keyboardType="numeric"
              value={shopPrice}
              onChangeText={setShopPrice}
            />
            <Button
              mode="contained"
              onPress={handleAddLaundry}
              style={{ marginTop: 8 }}
            >
              Add Shop
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
                <Text>No laundry services available.</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", color: "#6200EE" },
  balanceRow: { flexDirection: "row", alignItems: "center" },
  search: { marginBottom: 8, backgroundColor: "#fff" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 },
  filterButton: { marginHorizontal: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, color: "#6200EE" },
  filterActive: { backgroundColor: "#E8DEF8" },
  card: { marginVertical: 6, padding: 8 },
  cardRow: { flexDirection: "row" },
  thumb: { width: 88, height: 88, borderRadius: 8, marginRight: 12 },
  thumbPlaceholder: { backgroundColor: "#6200EE", justifyContent: "center", alignItems: "center" },
  cardBody: { flex: 1 },
  serviceTitle: { fontWeight: "700", fontSize: 16 },
  serviceMeta: { color: "#666", marginTop: 4 },
  serviceDesc: { color: "#444", marginTop: 6 },
  cardActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  rating: { marginLeft: 12 },
});
