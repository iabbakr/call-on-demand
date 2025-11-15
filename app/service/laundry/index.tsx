// app/services/laundry/index.tsx
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
import { notifyUsers } from "../../../lib/notifications";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

type LaundryService = {
  id?: string;
  name: string;
  state: string;
  city: string;
  price: number;
  address?: string;
  thumbnail?: string;
  description?: string;
  rating?: number;
  tags?: string[];
};

export default function LaundryServices() {
  const { user } = useAuth();
  const { userProfile, balance, deductBalance, addTransaction, refreshBalance } = useApp();
  const [services, setServices] = useState<LaundryService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<StateName | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [newLaundry, setNewLaundry] = useState<Partial<LaundryService>>({
    name: "",
    state: "",
    city: "",
    price: 0,
    description: "",
  });

  const isAdmin = userProfile?.role === "admin";

  // Fetch laundry shops
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "services"), where("category", "==", "laundry"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as DocumentData) } as LaundryService)
      );
      setServices(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filters
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

  // Image picker
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // Upload image
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
    data.append("cloud_name", process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: data }
    );
    const result = await res.json();
    if (!result.secure_url) throw new Error("Upload failed");
    return result.secure_url;
  };

  // Add new laundry
  const addLaundry = async () => {
    if (!newLaundry.name || !newLaundry.state || !newLaundry.city || !newLaundry.price)
      return Alert.alert("Missing fields", "Please fill all required fields.");
    setUploading(true);
    try {
      let imageUrl = "";
      if (image) imageUrl = await uploadToCloudinary(image);

      const docRef = await addDoc(collection(db, "services"), {
        ...newLaundry,
        category: "laundry",
        thumbnail: imageUrl,
        createdAt: Date.now(),
      });

      // Notify nearby users
      try {
        await notifyUsers(
          { state: newLaundry.state, city: newLaundry.city },
          {
            title: "🧺 New Laundry Service Available!",
            body: `${newLaundry.name} now open in ${newLaundry.city}, ${newLaundry.state}`,
            data: { laundryId: docRef.id, category: "laundry" },
          }
        );
      } catch (notifErr) {
        console.error("Notification error:", notifErr);
      }

      Alert.alert("✅ Laundry added successfully");
      setNewLaundry({ name: "", state: "", city: "", price: 0, description: "" });
      setImage(null);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add laundry");
    } finally {
      setUploading(false);
    }
  };

  // Delete
  const deleteLaundry = async (id: string, name: string) => {
    Alert.alert("Delete Laundry", `Remove ${name}?`, [
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

  // Navigate to details
  const openDetails = (service: LaundryService) => {
    if (!service.id) return;
    router.push(`/service/laundry/${service.id}`);
  };

  // Render
  const renderItem = ({ item }: { item: LaundryService }) => (
    <Swipeable
      renderRightActions={() =>
        isAdmin ? (
          <Button
            mode="contained"
            color="red"
            onPress={() => deleteLaundry(item.id!, item.name)}
            style={{ justifyContent: "center", marginVertical: 25 }}
          >
            Delete
          </Button>
        ) : null
      }
    >
      <TouchableOpacity onPress={() => openDetails(item)}>
        <Card style={styles.card}>
          <View style={styles.row}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.place]}>
                <Text style={{ color: "#fff" }}>🧺</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.city}, {item.state} • ₦{item.price?.toLocaleString()}
              </Text>
              <View style={styles.actionRow}>
                <Button compact mode="contained" onPress={() => openDetails(item)}>
                  Book
                </Button>
                <Text style={{ alignSelf: "center" }}>⭐ {item.rating ?? "—"}</Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Swipeable>
  );

  const Header = (
    <View style={{ padding: 12 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Laundry Services</Text>
      </View>

      <View style={styles.balanceCard}>
        <View>
          <Text style={{ color: BACKGROUND_COLOR, fontSize: 12 }}>
            Your wallet balance
          </Text>
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
        placeholder="Search laundry, cleaners or tags..."
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

      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminTitle}>Admin: Laundry Management</Text>

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
                router.push("/service/laundry/admin/admin-orders")
              }
            >
              View Orders
            </Button>
            <Button
              mode="outlined"
              onPress={() =>
                router.push("/service/laundry/admin/admin-analytics")
              }
            >
              View Analytics
            </Button>
          </View>

          <Text style={styles.adminTitle}>Add Laundry Shop</Text>

          <Button
            icon="image"
            mode="outlined"
            onPress={pickImage}
            style={{ marginVertical: 6 }}
          >
            {image ? "Change Image" : "Select Shop Image"}
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
            value={newLaundry.name}
            onChangeText={(t) =>
              setNewLaundry((p) => ({ ...p, name: t }))
            }
          />
          <TextInput
            label="Price (₦)"
            keyboardType="numeric"
            value={newLaundry.price?.toString() ?? ""}
            onChangeText={(t) =>
              setNewLaundry((p) => ({ ...p, price: Number(t) }))
            }
          />
          <TextInput
            label="State"
            value={newLaundry.state}
            onChangeText={(t) =>
              setNewLaundry((p) => ({ ...p, state: t }))
            }
          />
          <TextInput
            label="City"
            value={newLaundry.city}
            onChangeText={(t) =>
              setNewLaundry((p) => ({ ...p, city: t }))
            }
          />
          <TextInput
            label="Description"
            multiline
            value={newLaundry.description}
            onChangeText={(t) =>
              setNewLaundry((p) => ({ ...p, description: t }))
            }
          />

          <Button
            mode="contained"
            loading={uploading}
            onPress={addLaundry}
            style={{ marginTop: 8 }}
          >
            {uploading ? "Uploading..." : "Add Laundry"}
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
      <Stack.Screen options={{ headerShown: true, headerTitle: "Laundry" }} />
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
              <Text>No laundry services available.</Text>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80 }}
        />
      )}
    </KeyboardAvoidingView>
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
  filterRow: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
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
  place: { backgroundColor: "#6200EE", justifyContent: "center", alignItems: "center" },
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
