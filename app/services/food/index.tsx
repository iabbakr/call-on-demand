import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
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
import { Swipeable } from "react-native-gesture-handler";
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
} from "../../../constants/data/nigeriaData";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";

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

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

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
  const [uploading, setUploading] = useState(false);

  // Admin form fields
  const [newFood, setNewFood] = useState<Partial<Service>>({
    name: "",
    state: "",
    city: "",
    price: 0,
    description: "",
  });
  const [image, setImage] = useState<string | null>(null);
  const isAdmin = userProfile?.role === "admin";

  // 🔄 Fetch food services
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

  // 🔍 Filtering logic
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

  // 🛒 Order food
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

  // 📸 Pick image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // ☁️ Upload image & Add food
  const addFood = async () => {
    if (!newFood.name || !newFood.state || !newFood.city || !newFood.price) {
      return Alert.alert("Missing fields", "Please fill all required fields.");
    }
    setUploading(true);
    try {
      let imageUrl = "";
      if (image) {
        const storage = getStorage();
        const response = await fetch(image);
        const blob = await response.blob();
        const fileRef = ref(storage, `foodImages/${Date.now()}.jpg`);
        await uploadBytes(fileRef, blob);
        imageUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "services"), {
        ...newFood,
        category: "food",
        thumbnail: imageUrl,
        createdAt: Date.now(),
      });

      Alert.alert("✅ Food added successfully");
      setNewFood({ name: "", state: "", city: "", price: 0, description: "" });
      setImage(null);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not add food");
    } finally {
      setUploading(false);
    }
  };

  // ❌ Delete food
  const deleteFood = async (id: string, name: string) => {
    Alert.alert("Confirm Delete", `Delete ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "services", id));
            Alert.alert("Deleted", `${name} removed.`);
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to delete");
          }
        },
      },
    ]);
  };

  // 🧾 Render item (swipe to delete)
  const renderItem = ({ item }: { item: Service }) => (
    <Swipeable
      renderRightActions={() =>
        isAdmin ? (
          <Button
            mode="contained"
            color="red"
            onPress={() => deleteFood(item.id!, item.name)}
            style={{ justifyContent: "center", marginVertical: 25 }}
          >
            Delete
          </Button>
        ) : null
      }
    >
      <TouchableOpacity onPress={() => router.push(`/services/food/${item.id}`)}>
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
      </TouchableOpacity>
    </Swipeable>
  );

  // 🧠 Header (Admin + Filters)
  const Header = (
    <View style={{ padding: 12 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Food & Delivery</Text>
      </View>

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

      <TextInput
        placeholder="Search meals, restaurants or tags..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {/* State filter */}
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

      {/* City filter */}
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

      {/* 👨‍🍳 Admin Section */}
      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminTitle}>Admin: Add Food Item</Text>

          <Button
            icon="image"
            mode="outlined"
            onPress={pickImage}
            style={{ marginVertical: 6 }}
          >
            {image ? "Change Image" : "Select Food Image"}
          </Button>

          {image && (
            <Image
              source={{ uri: image }}
              style={{ width: "100%", height: 150, borderRadius: 8, marginBottom: 10 }}
            />
          )}

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
          <Button
            mode="contained"
            loading={uploading}
            onPress={addFood}
            style={{ marginTop: 8 }}
          >
            {uploading ? "Uploading..." : "Upload Food"}
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
            <RefreshControl refreshing={refreshing} onRefresh={refreshBalance} />
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
  title: { fontSize: 20, fontWeight: "700", color: PRIMARY_COLOR },
  balanceCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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
