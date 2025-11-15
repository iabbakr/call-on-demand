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
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
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

type Product = {
  id?: string;
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
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<StateName | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    state: "",
    city: "",
    price: 0,
    description: "",
    phone: "",
    address: "",
  });

  const isAdmin = userProfile?.role === "admin";

  // 🔹 Fetch shop products
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "services"), where("category", "==", "shop"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as DocumentData) } as Product)
      );
      setProducts(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🔹 Filtered products
  const filtered = useMemo(() => {
    let list = products;
    if (filterState) list = list.filter((p) => p.state === filterState);
    if (filterCity) list = list.filter((p) => p.city === filterCity);
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

  // 🔹 Pick image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // 🔹 Upload to Cloudinary
  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: "image/jpeg",
      name: "upload.jpg",
    } as any);
    data.append(
      "upload_preset",
      process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    );
    data.append(
      "cloud_name",
      process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!
    );

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: data }
    );
    const result = await res.json();
    if (!result.secure_url) throw new Error("Upload failed");
    return result.secure_url;
  };

  // 🔹 Add product
  const addProduct = async () => {
    if (
      !newProduct.name ||
      !newProduct.price ||
      !newProduct.state ||
      !newProduct.city
    ) {
      return Alert.alert("Missing fields", "Please fill all required fields.");
    }
    setUploading(true);
    try {
      let imageUrl = "";
      if (image) imageUrl = await uploadToCloudinary(image);

      await addDoc(collection(db, "services"), {
        ...newProduct,
        category: "shop",
        thumbnail: imageUrl,
        createdAt: Date.now(),
      });

      Alert.alert("✅ Product added successfully");
      setNewProduct({ name: "", state: "", city: "", price: 0, description: "" });
      setImage(null);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add product");
    } finally {
      setUploading(false);
    }
  };

  // 🔹 Delete
  const deleteProduct = async (id: string, name: string) => {
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

  // 🔹 Order (buy)
  const orderProduct = async (product: Product) => {
    try {
      if (!user)
        return Alert.alert("Sign in required", "Please sign in to purchase.");
      if (balance < product.price)
        return Alert.alert("Insufficient funds", "Top up your wallet.");

      await deductBalance(product.price, `Bought ${product.name}`, "shop");
      await addTransaction({
        description: `Bought ${product.name}`,
        amount: product.price,
        category: "shop",
        type: "debit",
        status: "success",
      });
      await refreshBalance();
      Alert.alert("Success", `${product.name} purchased successfully!`);
    } catch (err: any) {
      Alert.alert("Order failed", err.message || "Try again later");
    }
  };

  // 🔹 Render each product
  const renderItem = ({ item }: { item: Product }) => (
    <Swipeable
      renderRightActions={() =>
        isAdmin ? (
          <Button
            mode="contained"
            color="red"
            onPress={() => deleteProduct(item.id!, item.name)}
            style={{ justifyContent: "center", marginVertical: 25 }}
          >
            Delete
          </Button>
        ) : null
      }
    >
      <TouchableOpacity onPress={() => router.push(`/services/shop/${item.id}`)}>
        <Card style={styles.card}>
          <View style={styles.row}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.placeholder]}>
                <Text style={{ color: "#fff" }}>🛍️</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                ₦{item.price?.toLocaleString()} • {item.city}, {item.state}
              </Text>
              <Text style={styles.desc}>{item.description}</Text>
              <View style={styles.actionRow}>
                <Button
                  compact
                  mode="contained"
                  onPress={() => orderProduct(item)}
                >
                  Buy Now
                </Button>
                <Text>⭐ {item.rating ?? "—"}</Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Swipeable>
  );

  // 🔹 Header Component
  const Header = (
    <View style={{ padding: 12 }}>
      <Text style={styles.title}>EliteHub Shop</Text>

      <View style={styles.balanceCard}>
        <View>
          <Text style={{ color: BACKGROUND_COLOR, fontSize: 12 }}>Wallet</Text>
          <Text
            style={{ color: BACKGROUND_COLOR, fontSize: 20, fontWeight: "700" }}
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
        placeholder="Search products..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <Text style={styles.filterLabel}>State:</Text>
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

      {filterState && (
        <>
          <Text style={styles.filterLabel}>City:</Text>
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
        </>
      )}

      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminTitle}>Admin: Shop Management</Text>

          {/* 🔹 Admin Tabs (mirrored from Food) */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Button
              mode="outlined"
              onPress={() =>
                router.push("./shop/admin/admin-orders")
              }
            >
              View Orders
            </Button>
            <Button
              mode="outlined"
              onPress={() =>
                router.push("./shop/admin/admin-analytics")
              }
            >
              View Analytics
            </Button>
          </View>

          <Text style={styles.adminTitle}>Add Product</Text>

          <Button
            icon="image"
            mode="outlined"
            onPress={pickImage}
            style={{ marginVertical: 6 }}
          >
            {image ? "Change Image" : "Select Product Image"}
          </Button>

          {image && (
            <Image
              source={{ uri: image }}
              style={{
                width: "100%",
                height: 150,
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
          )}

          <TextInput
            label="Name"
            value={newProduct.name}
            onChangeText={(t) =>
              setNewProduct((p) => ({ ...p, name: t }))
            }
          />
          <TextInput
            label="Price (₦)"
            keyboardType="numeric"
            value={newProduct.price?.toString() ?? ""}
            onChangeText={(t) =>
              setNewProduct((p) => ({ ...p, price: Number(t) }))
            }
          />
          <TextInput
            label="State"
            value={newProduct.state}
            onChangeText={(t) =>
              setNewProduct((p) => ({ ...p, state: t }))
            }
          />
          <TextInput
            label="City"
            value={newProduct.city}
            onChangeText={(t) =>
              setNewProduct((p) => ({ ...p, city: t }))
            }
          />
          <TextInput
            label="Description"
            multiline
            value={newProduct.description}
            onChangeText={(t) =>
              setNewProduct((p) => ({ ...p, description: t }))
            }
          />

          <Button
            mode="contained"
            loading={uploading}
            onPress={addProduct}
            style={{ marginTop: 8 }}
          >
            {uploading ? "Uploading..." : "Upload Product"}
          </Button>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ headerShown: true, headerTitle: "Shop" }} />
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
              <Text>No shop products available.</Text>
            </View>
          }
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: 80,
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  filterLabel: { marginTop: 8, fontWeight: "600" },
  filterBtn: {
    marginHorizontal: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  filterActive: { backgroundColor: "#E8DEF8" },
  card: { marginVertical: 6, padding: 8 },
  row: { flexDirection: "row" },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholder: {
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontWeight: "700", fontSize: 16 },
  meta: { color: "#666", marginTop: 4 },
  desc: { color: "#444", marginTop: 6 },
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
  adminTitle: { fontWeight: "700", marginBottom: 8, color: PRIMARY_COLOR },
});
