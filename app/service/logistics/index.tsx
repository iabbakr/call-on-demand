// ============================================
// 1. LOGISTICS LIST - logistics/index.tsx
// ============================================
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
  serverTimestamp,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  Chip,
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
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const SCREEN_BG = "#F5F5F5";

const { width } = Dimensions.get("window");

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

  // Fetch logistics points
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

  // Image helpers
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled) setThumb(res.assets[0].uri);
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

      Alert.alert("✅ Added", "Logistics point added successfully.");
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
    await refreshBalance();
    setRefreshing(false);
  };

  const renderRightActions = (item: LogisticsPoint) => (
    <TouchableOpacity
      onPress={() => deletePoint(item.id!, item.name)}
      style={styles.deleteAction}
    >
      <FontAwesome5 name="trash" size={20} color="#FFF" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: LogisticsPoint }) => (
    <Swipeable renderRightActions={() => (isAdmin ? renderRightActions(item) : null)}>
      <TouchableOpacity onPress={() => router.push(`/service/logistics/${item.id}`)} activeOpacity={0.7}>
        <Card style={styles.logisticsCard}>
          <View style={styles.cardContent}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                <FontAwesome5 name="truck" size={32} color="#FFF" />
              </View>
            )}

            <View style={styles.logisticsInfo}>
              <Text style={styles.logisticsName} numberOfLines={2}>{item.name}</Text>

              <View style={styles.locationRow}>
                <FontAwesome5 name="map-marker-alt" size={12} color="#666" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.city}, {item.state}
                </Text>
              </View>

              {item.phone && (
                <View style={styles.phoneRow}>
                  <FontAwesome5 name="phone" size={12} color="#666" />
                  <Text style={styles.phoneText}>{item.phone}</Text>
                </View>
              )}

              <View style={styles.bottomRow}>
                {item.rating && (
                  <View style={styles.ratingContainer}>
                    <FontAwesome5 name="star" size={12} color="#FFB800" solid />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                )}
                <Button
                  mode="contained"
                  compact
                  style={styles.bookButton}
                  labelStyle={styles.bookButtonLabel}
                  onPress={() => router.push(`/service/logistics/${item.id}`)}
                >
                  Request
                </Button>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Swipeable>
  );

  const Header = (
    <View style={styles.headerContainer}>
      {/* Balance Card */}
      <Card style={styles.balanceCard}>
        <Card.Content>
          <View style={styles.balanceContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <View style={styles.balanceRow}>
                <FontAwesome5 name="wallet" size={18} color="#FFF" />
                <Text style={styles.balanceAmount}>₦{balance.toLocaleString()}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={refreshBalance} style={styles.refreshButton}>
              <FontAwesome5 name="sync-alt" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* Search */}
      <TextInput
        mode="outlined"
        placeholder="Search logistics or address..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
        left={<TextInput.Icon icon="magnify" />}
        right={search ? <TextInput.Icon icon="close" onPress={() => setSearch("")} /> : null}
      />

      {/* Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter by State</Text>
          {filterState && (
            <Chip
              compact
              onPress={() => {
                setFilterState(null);
                setFilterCity(null);
              }}
              style={styles.clearChip}
            >
              Clear All
            </Chip>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {getStates().map((s) => (
            <Chip
              key={s}
              selected={filterState === s}
              onPress={() => {
                setFilterState(s);
                setFilterCity(null);
              }}
              style={[styles.filterChip, filterState === s && styles.filterChipActive]}
              textStyle={filterState === s && styles.filterChipTextActive}
            >
              {s}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {filterState && (
        <View style={styles.filtersSection}>
          <Text style={styles.filterTitle}>Filter by City</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {getCitiesByState(filterState).map((c) => (
              <Chip
                key={c}
                selected={filterCity === c}
                onPress={() => setFilterCity(c)}
                style={[styles.filterChip, filterCity === c && styles.filterChipActive]}
                textStyle={filterCity === c && styles.filterChipTextActive}
              >
                {c}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Admin Section */}
      {isAdmin && (
        <Card style={styles.adminCard}>
          <Card.Content>
            <View style={styles.adminHeader}>
              <FontAwesome5 name="user-shield" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.adminTitle}>Admin Panel</Text>
            </View>

            <View style={styles.adminActions}>
              <Button
                mode="outlined"
                icon="clipboard-list"
                onPress={() => router.push("./logistics/admin/admin-management")}
                style={styles.adminActionBtn}
                labelStyle={styles.adminActionLabel}
              >
                Manage
              </Button>
              <Button
                mode="outlined"
                icon="chart-line"
                onPress={() => router.push("./logistics/admin/admin-analytics")}
                style={styles.adminActionBtn}
                labelStyle={styles.adminActionLabel}
              >
                Analytics
              </Button>
            </View>

            <View style={styles.divider} />

            <Text style={styles.adminSubtitle}>Add Logistics Point</Text>

            <Button icon="image" mode="outlined" onPress={pickImage} style={styles.imageButton} labelStyle={{ fontSize: 13 }}>
              {thumb ? "Change Image" : "Select Image"}
            </Button>

            {thumb && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: thumb }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setThumb(null)}>
                  <FontAwesome5 name="times-circle" size={24} color={ERROR_COLOR} />
                </TouchableOpacity>
              </View>
            )}

            <TextInput mode="outlined" label="Name *" value={newPoint.name} onChangeText={(t) => setNewPoint((p) => ({ ...p, name: t }))} style={styles.input} />
            <TextInput mode="outlined" label="State *" value={newPoint.state} onChangeText={(t) => setNewPoint((p) => ({ ...p, state: t }))} style={styles.input} />
            <TextInput mode="outlined" label="City *" value={newPoint.city} onChangeText={(t) => setNewPoint((p) => ({ ...p, city: t }))} style={styles.input} />
            <TextInput mode="outlined" label="Address *" value={newPoint.address} onChangeText={(t) => setNewPoint((p) => ({ ...p, address: t }))} style={styles.input} />
            <TextInput mode="outlined" label="Phone" value={newPoint.phone} onChangeText={(t) => setNewPoint((p) => ({ ...p, phone: t }))} style={styles.input} />
            <TextInput mode="outlined" label="Description" multiline numberOfLines={3} value={newPoint.description} onChangeText={(t) => setNewPoint((p) => ({ ...p, description: t }))} style={styles.input} />

            <Button mode="contained" loading={uploading} disabled={uploading} onPress={addPoint} style={styles.uploadButton} icon="upload">
              {uploading ? "Uploading..." : "Add Logistics Point"}
            </Button>
          </Card.Content>
        </Card>
      )}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filtered.length} {filtered.length === 1 ? "Point" : "Points"} Available
        </Text>
      </View>
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
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push("/profile/transaction-history")} style={{ paddingRight: 16 }}>
              <FontAwesome5 name="history" size={20} color="#fff" />
            </Pressable>
          ),
        }}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading logistics...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id!}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_COLOR]} />}
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="truck" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No Logistics Points Found</Text>
              <Text style={styles.emptyText}>
                {search || filterState || filterCity ? "Try adjusting your filters" : "No logistics points available at the moment"}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: 16, paddingTop: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: SCREEN_BG },
  loadingText: { marginTop: 12, color: "#666", fontSize: 14 },

  // Balance Card
  balanceCard: { backgroundColor: PRIMARY_COLOR, borderRadius: 16, marginBottom: 16, elevation: 4 },
  balanceContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  balanceLabel: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginBottom: 8, fontWeight: "500" },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  balanceAmount: { color: "#FFF", fontSize: 24, fontWeight: "bold" },
  refreshButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },

  // Search
  searchInput: { backgroundColor: BACKGROUND_COLOR, marginBottom: 16 },

  // Filters
  filtersSection: { marginBottom: 16 },
  filterHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  filterTitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  clearChip: { height: 28 },
  filterScroll: { paddingVertical: 4 },
  filterChip: { marginRight: 8, backgroundColor: BACKGROUND_COLOR },
  filterChipActive: { backgroundColor: PRIMARY_COLOR },
  filterChipTextActive: { color: "#FFF" },

  // Results
  resultsHeader: { paddingVertical: 12 },
  resultsText: { fontSize: 16, fontWeight: "600", color: "#333" },

  // Logistics Cards
  logisticsCard: { marginBottom: 16, borderRadius: 16, elevation: 3, backgroundColor: BACKGROUND_COLOR },
  cardContent: { flexDirection: "row", padding: 12 },
  thumbnail: { width: 120, height: 120, borderRadius: 12, marginRight: 12 },
  thumbnailPlaceholder: { backgroundColor: PRIMARY_COLOR, justifyContent: "center", alignItems: "center" },
  logisticsInfo: { flex: 1, justifyContent: "space-between" },
  logisticsName: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  locationText: { fontSize: 13, color: "#666", flex: 1 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  phoneText: { fontSize: 12, color: "#666" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF9E6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { fontSize: 13, fontWeight: "600", color: "#333" },
  bookButton: { borderRadius: 8, elevation: 0 },
  bookButtonLabel: { fontSize: 13 },

  // Delete Action
  deleteAction: { backgroundColor: ERROR_COLOR, justifyContent: "center", alignItems: "center", width: 80, marginVertical: 8, marginRight: 16, borderRadius: 16 },
  deleteText: { color: "#FFF", fontSize: 12, fontWeight: "600", marginTop: 4 },

  // Admin Section
  adminCard: { backgroundColor: ACCENT_COLOR, borderRadius: 16, marginBottom: 16, elevation: 2 },
  adminHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  adminTitle: { fontSize: 18, fontWeight: "700", color: PRIMARY_COLOR },
  adminActions: { flexDirection: "row", gap: 12, marginBottom: 16 },
  adminActionBtn: { flex: 1, borderColor: PRIMARY_COLOR },
  adminActionLabel: { fontSize: 12 },
  divider: { height: 1, backgroundColor: PRIMARY_COLOR + "30", marginVertical: 16 },
  adminSubtitle: { fontSize: 16, fontWeight: "600", color: PRIMARY_COLOR, marginBottom: 12 },
  imageButton: { marginBottom: 12 },
  imagePreview: { position: "relative", marginBottom: 12 },
  previewImage: { width: "100%", height: 180, borderRadius: 12 },
  removeImageBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "#FFF", borderRadius: 12 },
  input: { marginBottom: 12, backgroundColor: BACKGROUND_COLOR },
  uploadButton: { marginTop: 8, borderRadius: 12 },

  // Empty State
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },
});