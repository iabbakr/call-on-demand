import { Stack } from "expo-router";
import {
  addDoc,
  collection,
  DocumentData,
  onSnapshot,
  query,
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
import {
  getCitiesByState,
  getStates,
  StateName,
} from "../../constants/data/nigeriaData";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

type Service = {
  id?: string;
  name: string;
  category: string;
  state: string;
  city: string;
  price: number;
  thumbnail?: string;
  rating?: number;
  description?: string;
  tags?: string[];
};

export default function FoodServices() {
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, refreshBalance } =
    useApp();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<StateName | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Admin form fields
  const [newFood, setNewFood] = useState<Partial<Service>>({
    name: "",
    state: "",
    city: "",
    price: 0,
    description: "",
  });
  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "services"), where("category", "==", "food"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as DocumentData) } as Service)
      );
      setServices(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = services;
    if (filterState) list = list.filter((s) => s.state === filterState);
    if (filterCity) list = list.filter((s) => s.city === filterCity);
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

  const order = async (service: Service) => {
    try {
      if (!user) return Alert.alert("Please sign in", "Sign in to order food.");
      if (balance < service.price)
        return Alert.alert("Insufficient funds", "Top up your wallet.");
      await deductBalance(service.price, `Ordered ${service.name}`, "food");
      await addTransaction({
        description: `Ordered ${service.name}`,
        amount: service.price,
        category: "food",
        type: "debit",
        status: "success",
      });
      Alert.alert("Order placed", `${service.name} will be delivered soon.`);
      await refreshBalance();
    } catch (err: any) {
      Alert.alert("Order failed", err?.message || "Try again");
    }
  };

  const addFood = async () => {
    if (!newFood.name || !newFood.state || !newFood.city || !newFood.price) {
      return Alert.alert("Missing fields", "Please fill all required fields.");
    }
    try {
      await addDoc(collection(db, "services"), {
        ...newFood,
        category: "food",
        createdAt: Date.now(),
      });
      Alert.alert("Food added successfully");
      setNewFood({ name: "", state: "", city: "", price: 0, description: "" });
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not add food");
    }
  };

  const renderItem = ({ item }: { item: Service }) => (
    <Card style={styles.card}>
      <View style={styles.row}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.place]}>
            <Text style={{ color: "#fff" }}>🍲</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.city}, {item.state} • ₦{item.price?.toLocaleString()}
          </Text>
          <View style={styles.actionRow}>
            <Button compact mode="contained" onPress={() => order(item)}>
              Order
            </Button>
            <Text style={{ alignSelf: "center" }}>⭐ {item.rating ?? "—"}</Text>
          </View>
        </View>
      </View>
    </Card>
  );

  const Header = (
    <View style={{ padding: 12 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Food & Delivery</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text>Wallet: ₦{balance.toLocaleString()}</Text>
          <IconButton icon="refresh" onPress={refreshBalance} size={20} />
        </View>
      </View>

      {/* 🔍 Search */}
      <TextInput
        placeholder="Search meals, restaurants or tags..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {/* Filters */}
      <View style={styles.filterRow}>
        <Text>State:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {getStates().map((s) => (
            <TouchableOpacity key={s} onPress={() => setFilterState(s)}>
              <Text
                style={[
                  styles.filterBtn,
                  filterState === s && styles.filterActive,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filterState && (
        <View style={styles.filterRow}>
          <Text>City:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {getCitiesByState(filterState).map((c) => (
              <TouchableOpacity key={c} onPress={() => setFilterCity(c)}>
                <Text
                  style={[
                    styles.filterBtn,
                    filterCity === c && styles.filterActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 👨‍🍳 Admin Panel */}
      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminTitle}>Admin: Add Food Item</Text>
          <TextInput
            label="Name"
            value={newFood.name}
            onChangeText={(t) => setNewFood((p) => ({ ...p, name: t }))}
          />
          <TextInput
            label="Price (₦)"
            keyboardType="numeric"
            value={newFood.price?.toString() ?? ""}
            onChangeText={(t) => setNewFood((p) => ({ ...p, price: Number(t) }))}
          />
          <TextInput
            label="State"
            value={newFood.state}
            onChangeText={(t) => setNewFood((p) => ({ ...p, state: t }))}
          />
          <TextInput
            label="City"
            value={newFood.city}
            onChangeText={(t) => setNewFood((p) => ({ ...p, city: t }))}
          />
          <TextInput
            label="Description"
            multiline
            value={newFood.description}
            onChangeText={(t) =>
              setNewFood((p) => ({ ...p, description: t }))
            }
          />
          <Button mode="contained" onPress={addFood}>
            Upload Food
          </Button>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, headerTitle: "Food" }} />
      {loading ? (
        <ActivityIndicator animating style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id!}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshBalance}
            />
          }
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <View style={{ padding: 20 }}>
              <Text>No food services available.</Text>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80 }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#6200EE" },
  search: { marginVertical: 8, backgroundColor: "#fff" },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  filterBtn: {
    marginHorizontal: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  filterActive: { backgroundColor: "#E8DEF8" },
  card: { marginVertical: 6, padding: 8 },
  row: { flexDirection: "row" },
  thumb: { width: 88, height: 88, borderRadius: 8, marginRight: 12 },
  place: {
    backgroundColor: "#6200EE",
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontWeight: "700" },
  meta: { color: "#666", marginTop: 4 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  adminSection: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  adminTitle: { fontWeight: "700", marginBottom: 8, color: "#6200EE" },
});
