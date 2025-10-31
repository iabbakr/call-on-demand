import { FontAwesome5 } from "@expo/vector-icons";
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
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  state: string;
  city?: string;
  description?: string;
  thumbnail?: string;
  tags?: string[];
  rating?: number;
  phone?: string;
  address?: string;
};

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

export default function Shop() {
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, refreshBalance } =
    useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState<any>({
    name: "",
    price: "",
    category: "general",
    state: "",
    city: "",
    description: "",
    thumbnail: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (userProfile?.role === "admin") setIsAdmin(true);
  }, [userProfile]);

  // 🧠 Load all shop products
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "services"), where("category", "==", "shop"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as DocumentData) } as Product)
        );
        setProducts(list);
        setLoading(false);

        // Extract states and cities dynamically
        const uniqueStates = Array.from(
          new Set(list.map((item) => item.state).filter(Boolean))
        ) as string[];
        setStates(uniqueStates.sort());

        if (filterState) {
          const cityList = Array.from(
            new Set(
              list
                .filter((p) => p.state === filterState)
                .map((p) => p.city)
                .filter(Boolean)
            )
          ) as string[];
          setCities(cityList.sort());
        }
      },
      (err) => {
        console.error("shop snapshot error", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [filterState]);

  const filtered = useMemo(() => {
    let list = products;
    if (filterState)
      list = list.filter(
        (p) => p.state?.toLowerCase() === filterState.toLowerCase()
      );
    if (filterCity)
      list = list.filter(
        (p) => p.city?.toLowerCase() === filterCity.toLowerCase()
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, filterState, filterCity, search]);

  const onBuy = async (product: Product) => {
    try {
      if (!user)
        return Alert.alert("Sign in required", "Please sign in to purchase a product.");
      if (balance < product.price)
        return Alert.alert("Insufficient balance", "Top up your wallet to proceed.");
      Alert.alert("Confirm Purchase", `Buy ${product.name} for ₦${product.price}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await deductBalance(product.price, `Bought ${product.name}`, "shop");
              await addTransaction({
                description: `Bought ${product.name}`,
                amount: product.price,
                category: "shop",
                type: "debit",
                status: "success",
              });
              Alert.alert("Purchase Complete", `${product.name} bought successfully.`);
              await refreshBalance();
            } catch (err: any) {
              console.error("purchase error", err);
              Alert.alert("Error", err.message || "Could not complete purchase.");
            }
          },
        },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not complete purchase.");
    }
  };

  const handleAddProduct = async () => {
    try {
      if (!adminForm.name || !adminForm.price || !adminForm.state)
        return Alert.alert("Missing fields", "Name, Price, and State are required.");
      const data = {
        ...adminForm,
        price: parseFloat(adminForm.price),
        category: "shop",
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, "services"), data);
      Alert.alert("Success", "Product added successfully!");
      setAdminForm({
        name: "",
        price: "",
        category: "general",
        state: "",
        city: "",
        description: "",
        thumbnail: "",
        phone: "",
        address: "",
      });
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Failed to add product.");
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

  const renderItem = ({ item }: { item: Product }) => (
    <Card style={styles.card}>
      <View style={styles.cardRow}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={{ color: "#fff" }}>🛒</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.state} {item.city ? `• ${item.city}` : ""} • ₦
            {item.price.toLocaleString()}
          </Text>
          {item.description ? (
            <Text numberOfLines={2} style={styles.desc}>
              {item.description}
            </Text>
          ) : null}
          {item.phone && <Text style={styles.phone}>📞 {item.phone}</Text>}
          {item.address && <Text style={styles.address}>{item.address}</Text>}
          <View style={styles.actions}>
            <Button compact mode="contained" onPress={() => onBuy(item)}>
              Buy
            </Button>
            <Text style={styles.rating}>⭐ {item.rating ?? "—"}</Text>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, headerTitle: "Shop" }} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* 💰 Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <View>
            <Text style={{ color: BACKGROUND_COLOR, fontSize: 12 }}>
              Your wallet balance
            </Text>
            <Text
              style={{
                color: BACKGROUND_COLOR,
                fontSize: 20,
                fontWeight: "700",
              }}
            >
              <FontAwesome5 name="coins" size={16} color={BACKGROUND_COLOR} /> ₦
              {balance.toLocaleString()}
            </Text>
          </View>
          <IconButton
            icon="refresh"
            iconColor={BACKGROUND_COLOR}
            size={20}
            onPress={refreshBalance}
          />
        </View>

        {/* 🔍 Search */}
        <TextInput
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        {/* 🧭 Advanced Filter (like food page) */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by State:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => {
                setFilterState(null);
                setFilterCity(null);
              }}
            >
              <Text
                style={[styles.filterChip, !filterState && styles.filterActive]}
              >
                All
              </Text>
            </TouchableOpacity>
            {states.map((state) => (
              <TouchableOpacity
                key={state}
                onPress={() => {
                  setFilterState(state);
                  setFilterCity(null);
                }}
              >
                <Text
                  style={[
                    styles.filterChip,
                    filterState === state && styles.filterActive,
                  ]}
                >
                  {state}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filterState && cities.length > 0 && (
            <>
              <Text style={[styles.filterLabel, { marginTop: 8 }]}>
                Filter by City:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity onPress={() => setFilterCity(null)}>
                  <Text
                    style={[
                      styles.filterChip,
                      !filterCity && styles.filterActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {cities.map((city) => (
                  <TouchableOpacity key={city} onPress={() => setFilterCity(city)}>
                    <Text
                      style={[
                        styles.filterChip,
                        filterCity === city && styles.filterActive,
                      ]}
                    >
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* 🛍 Product List */}
        {loading ? (
          <ActivityIndicator animating />
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
                <Text>No products available.</Text>
              </View>
            }
          />
        )}

        {/* 👨‍💼 Admin Panel */}
        {isAdmin && (
          <View style={styles.adminContainer}>
            <Text style={styles.adminTitle}>Add New Product</Text>
            {Object.keys(adminForm).map((key) => (
              <TextInput
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={adminForm[key]}
                onChangeText={(val) =>
                  setAdminForm({ ...adminForm, [key]: val })
                }
                style={styles.input}
              />
            ))}
            <Button mode="contained" onPress={handleAddProduct}>
              Add Product
            </Button>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, backgroundColor: "#fff" },
  balanceCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  search: { marginVertical: 8 },
  filterContainer: { marginBottom: 10 },
  filterLabel: { fontWeight: "600", color: "#444", marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#EEE",
    marginRight: 6,
  },
  filterActive: { backgroundColor: "#E8DEF8", color: PRIMARY_COLOR },
  card: { marginVertical: 6, padding: 8 },
  cardRow: { flexDirection: "row" },
  thumb: { width: 88, height: 88, borderRadius: 8, marginRight: 12 },
  thumbPlaceholder: {
    backgroundColor: "#6200EE",
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontWeight: "700", fontSize: 16 },
  meta: { color: "#666", marginTop: 4 },
  desc: { color: "#444", marginTop: 6 },
  phone: { color: "#333", marginTop: 4 },
  address: { color: "#777", fontSize: 12 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  rating: { marginLeft: 10 },
  adminContainer: {
    marginTop: 30,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f9f9ff",
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6200EE",
    marginBottom: 10,
  },
  input: { marginBottom: 10 },
});
