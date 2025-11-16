import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
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
  serverTimestamp
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
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

type LogisticsPoint = {
  id?: string;
  name: string;
  provider?: string;
  state: string;
  city?: string;
  address?: string;
  phone?: string;
  rating?: number;
  description?: string;
  tags?: string[];
  thumbnail?: string;
};

export default function Logistics() {
  const { user } = useAuth();
  const { userProfile, balance, refreshBalance } = useApp();

  const [points, setPoints] = useState<LogisticsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<StateName | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Admin: add logistics point
  const [uploading, setUploading] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [newPoint, setNewPoint] = useState<Partial<LogisticsPoint>>({
    name: "",
    state: "",
    city: "",
    address: "",
    phone: "",
    description: "",
  });

  const isAdmin = userProfile?.role === "admin";

  // Firestore: fetch logistics points
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "logistics_points"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as DocumentData) } as LogisticsPoint)
      );
      setPoints(arr);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filtering
  const filtered = useMemo(() => {
    let list = points;
    if (filterState) list = list.filter((p) => p.state === filterState);
    if (filterCity) list = list.filter((p) => p.city === filterCity);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.provider || "").toLowerCase().includes(q) ||
          (p.address || "").toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [points, filterState, filterCity, search]);

  // Image picker helpers
  const pickImage = async (setImage: React.Dispatch<React.SetStateAction<string | null>>) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const data = new FormData();
    data.append("file", { uri, type: "image/jpeg", name: "upload.jpg" } as any);
    data.append("upload_preset", process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    data.append("cloud_name", process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: data }
    );
    const result = await res.json();
    if (!result.secure_url) throw new Error("Upload failed");
    return result.secure_url;
  };

  const addPoint = async () => {
    if (!newPoint.name || !newPoint.state || !newPoint.city || !newPoint.address) {
      return Alert.alert("Missing fields", "Please fill name, state, city and address.");
    }
    setUploading(true);
    try {
      const thumbUrl = thumb ? await uploadToCloudinary(thumb) : "";
      const ref = await addDoc(collection(db, "logistics_points"), {
        ...newPoint,
        thumbnail: thumbUrl,
        createdAt: serverTimestamp(),
      });

      // Notify users
      try {
        await notifyUsers(
          { state: newPoint.state, city: newPoint.city },
          {
            title: "🚚 New Logistics Point",
            body: `${newPoint.name} is now available in ${newPoint.city}, ${newPoint.state}.`,
            data: { logisticsId: ref.id, category: "logistics" },
          }
        );
      } catch (err) {
        console.error("notifyUsers error:", err);
      }

      Alert.alert("Added", "Logistics point added successfully.");
      setNewPoint({ name: "", state: "", city: "", address: "", phone: "", description: "" });
      setThumb(null);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to add logistics point.");
    } finally {
      setUploading(false);
    }
  };

  const deletePoint = async (id: string, name: string) => {
    Alert.alert("Confirm delete", `Delete ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "logistics_points", id));
            Alert.alert("Deleted", `${name} removed.`);
          } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to delete.");
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBalance();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: LogisticsPoint }) => (
    <Swipeable
      renderRightActions={() =>
        isAdmin ? (
          <Button
            mode="contained"
            color="red"
            onPress={() => deletePoint(item.id!, item.name)}
            style={{ justifyContent: "center", marginVertical: 25 }}
          >
            Delete
          </Button>
        ) : null
      }
    >
      <TouchableOpacity onPress={() => router.push(`/service/logistics/${item.id}`)}>
        <Card style={styles.card}>
          <View style={styles.row}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.place]}>
                <Text style={{ color: "#fff" }}>🚚</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.address ? `${item.address} — ` : ""}
                {item.city}, {item.state}
              </Text>
              {item.phone && <Text style={styles.desc}>📞 {item.phone}</Text>}
              <Text>⭐ {item.rating ?? "—"}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Swipeable>
  );

  const Header = (
    <View style={{ padding: 12 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Logistics & Delivery</Text>
      </View>

      <View style={styles.balanceCard}>
        <View>
          <Text style={{ color: BACKGROUND_COLOR, fontSize: 12 }}>Your wallet balance</Text>
          <Text style={{ color: BACKGROUND_COLOR, fontSize: 20, fontWeight: "700" }}>
            <FontAwesome5 name="coins" size={16} color={BACKGROUND_COLOR} /> ₦{balance.toLocaleString()}
          </Text>
        </View>
        <IconButton icon="refresh" iconColor={BACKGROUND_COLOR} size={20} onPress={refreshBalance} />
      </View>

      <TextInput
        placeholder="Search logistics or address..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <View style={styles.filterRow}>
        <Text>State:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {getStates().map((s) => (
            <TouchableOpacity key={s} onPress={() => setFilterState(s)}>
              <Text style={[styles.filterBtn, filterState === s && styles.filterActive]}>{s}</Text>
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
                <Text style={[styles.filterBtn, filterCity === c && styles.filterActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminTitle}>Admin: Manage Logistics Points</Text>

          <Button icon="image" mode="outlined" onPress={() => pickImage(setThumb)} style={{ marginVertical: 6 }}>
            {thumb ? "Change Image" : "Select Image"}
          </Button>

          {thumb && <Image source={{ uri: thumb }} style={{ width: "100%", height: 150, borderRadius: 8, marginBottom: 10 }} />}

          <TextInput label="Name" value={newPoint.name} onChangeText={(t) => setNewPoint((p) => ({ ...p, name: t }))} style={{ marginBottom: 8 }} />
          <TextInput label="State" value={newPoint.state} onChangeText={(t) => setNewPoint((p) => ({ ...p, state: t }))} style={{ marginBottom: 8 }} />
          <TextInput label="City" value={newPoint.city} onChangeText={(t) => setNewPoint((p) => ({ ...p, city: t }))} style={{ marginBottom: 8 }} />
          <TextInput label="Address" value={newPoint.address} onChangeText={(t) => setNewPoint((p) => ({ ...p, address: t }))} style={{ marginBottom: 8 }} />
          <TextInput label="Phone" value={newPoint.phone} onChangeText={(t) => setNewPoint((p) => ({ ...p, phone: t }))} style={{ marginBottom: 8 }} />
          <TextInput label="Description" multiline value={newPoint.description} onChangeText={(t) => setNewPoint((p) => ({ ...p, description: t }))} style={{ marginBottom: 8 }} />

          <Button mode="contained" loading={uploading} onPress={addPoint} style={{ marginTop: 8 }}>
            {uploading ? "Uploading..." : "Add Logistics Point"}
          </Button>

          {/* Admin Navigation Buttons */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
            <Button
              mode="outlined"
              onPress={() => router.push("./logistics/admin/admin-management")}
              style={{ flex: 1, marginRight: 6 }}
            >
              Management
            </Button>
            <Button
              mode="outlined"
              onPress={() => router.push("./logistics/admin/admin-management")}
              style={{ flex: 1, marginRight: 6 }}
            >
              Request
            </Button>
            <Button
              mode="outlined"
              onPress={() => router.push("./logistics/admin/admin-request")}
              style={{ flex: 1, marginLeft: 6 }}
            >
              Analytics
            </Button>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Logistics & Delivery",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.back()} >
                <MaterialIcons name="arrow-back" size={24} color="#fff" style={{ paddingLeft: 5 }} />
              </Pressable>
            );
          },
          headerRight: () => (
            <Pressable 
              onPress={() => router.push("/profile/transaction-history")}
              style={{ paddingLeft: 8 }}
            >
              <FontAwesome5 name="history" size={20} color="#fff" />
            </Pressable>
          ),
        }}
      />
      {loading ? (
        <ActivityIndicator animating style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id!}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={Header}
          ListEmptyComponent={<View style={{ padding: 20 }}><Text>No logistics available.</Text></View>}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80 }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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
  filterBtn: { marginHorizontal: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  filterActive: { backgroundColor: "#E8DEF8" },
  card: { marginVertical: 6, padding: 8 },
  row: { flexDirection: "row" },
  thumb: { width: 88, height: 88, borderRadius: 8, marginRight: 12 },
  place: { backgroundColor: PRIMARY_COLOR, justifyContent: "center", alignItems: "center" },
  name: { fontWeight: "700" },
  meta: { color: "#666", marginTop: 4 },
  desc: { color: "#444", marginTop: 4 },
  adminSection: { backgroundColor: "#F5F5F5", padding: 12, borderRadius: 8, marginVertical: 12 },
  adminTitle: { fontWeight: "700", marginBottom: 8, color: PRIMARY_COLOR },
});
