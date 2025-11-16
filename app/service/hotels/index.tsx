// hotels/index.tsx - Improved Styling + Room Types & Extras
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
  where,
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

type RoomType = {
  type: string;
  price: number;
};

type Hotel = {
  id?: string;
  name: string;
  category: string;
  state: string;
  city: string;
  thumbnail?: string;
  rating?: number;
  description?: string;
  tags?: string[];
  address?: string;
  roomTypes?: RoomType[];
  starRating?: number;
  extras?: {
    pool?: boolean;
    wifi?: boolean;
    breakfast?: boolean;
    light247?: boolean;
  };
};

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const CARD_BG = "#FFFFFF";
const SCREEN_BG = "#F5F5F5";

const { width } = Dimensions.get("window");

export default function Hotels() {
  const { user } = useAuth();
  const { userProfile, balance, refreshBalance } = useApp();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<StateName | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const [newHotel, setNewHotel] = useState<Partial<Hotel>>({
    name: "",
    state: "",
    city: "",
    description: "",
    address: "",
    roomTypes: [], // start empty
    starRating: 3,
    extras: {
      pool: false,
      wifi: false,
      breakfast: false,
      light247: false,
    },
  });

  // local temp inputs for adding room type
  const [roomTypeName, setRoomTypeName] = useState("");
  const [roomTypePrice, setRoomTypePrice] = useState("");

  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "services"), where("category", "==", "hotel"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as DocumentData) } as Hotel)
      );
      setHotels(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = hotels;
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
  }, [hotels, filterState, filterCity, search]);

  // Image picker
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // Cloudinary upload helper (same as before)
  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: "image/jpeg",
      name: "upload.jpg",
    } as any);
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

  // Add room type locally
  const addRoomTypeToList = () => {
    const name = roomTypeName.trim();
    const price = parseFloat(roomTypePrice);
    if (!name) return Alert.alert("Invalid", "Enter a room type name");
    if (isNaN(price) || price <= 0) return Alert.alert("Invalid", "Enter a valid price");
    const existing = newHotel.roomTypes || [];
    const updated = [...existing, { type: name, price }];
    setNewHotel((p) => ({ ...p, roomTypes: updated }));
    setRoomTypeName("");
    setRoomTypePrice("");
  };

  const removeRoomType = (index: number) => {
    const existing = [...(newHotel.roomTypes || [])];
    existing.splice(index, 1);
    setNewHotel((p) => ({ ...p, roomTypes: existing }));
  };

  // Toggle extras
  const toggleExtra = (key: keyof NonNullable<Hotel["extras"]>) => {
    setNewHotel((p) => ({
      ...p,
      extras: {
        ...(p.extras || {}),
        [key]: !(p.extras as any)?.[key],
      },
    }));
  };

  // Add hotel (validates fields including at least 1 room type)
  const addHotel = async () => {
    if (!newHotel.name || !newHotel.state || !newHotel.city) {
      return Alert.alert("Missing fields", "Please fill hotel name, state and city.");
    }
    const roomTypes = newHotel.roomTypes || [];
    if (!roomTypes.length) {
      return Alert.alert("Missing room types", "Add at least one room type with price.");
    }

    setUploading(true);
    try {
      let imageUrl = "";
      if (image) imageUrl = await uploadToCloudinary(image);

      // Compute tags, min price for display
      const minPrice = Math.min(...roomTypes.map((r) => r.price));
      const payload: Partial<Hotel & { minPrice?: number }> = {
        name: newHotel.name,
        state: newHotel.state,
        city: newHotel.city,
        description: newHotel.description || "",
        address: newHotel.address || "",
        roomTypes,
        starRating: newHotel.starRating || 3,
        extras: newHotel.extras || {},
        thumbnail: imageUrl,
        category: "hotel",
        tags: [
          ...(newHotel.tags || []),
          `${newHotel.starRating || 3}-star`,
          ...(newHotel.extras?.pool ? ["pool"] : []),
          ...(newHotel.extras?.wifi ? ["wifi"] : []),
        ],
        // optional helpful field
        price: minPrice, // keep compatibility for listing old code that reads price
        createdAt: Date.now(),
      };

      await addDoc(collection(db, "services"), payload);

      Alert.alert("✅ Hotel added successfully");
      setNewHotel({
        name: "",
        state: "",
        city: "",
        description: "",
        address: "",
        roomTypes: [],
        starRating: 3,
        extras: {
          pool: false,
          wifi: false,
          breakfast: false,
          light247: false,
        },
      });
      setImage(null);
      setRoomTypeName("");
      setRoomTypePrice("");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not add hotel");
    } finally {
      setUploading(false);
    }
  };

  const deleteHotel = async (id: string, name: string) => {
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

  const renderRightActions = (item: Hotel) => (
    <TouchableOpacity
      onPress={() => deleteHotel(item.id!, item.name)}
      style={styles.deleteAction}
    >
      <FontAwesome5 name="trash" size={20} color="#FFF" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  // Helper: get lowest room price to show "From"
  const getLowestRoomPrice = (hotel: Hotel) => {
    const r = hotel.roomTypes || [];
    if (!r.length) return 0;
    return Math.min(...r.map((x) => x.price));
  };

  const renderItem = ({ item }: { item: Hotel }) => {
    const lowest = getLowestRoomPrice(item);
    return (
      <Swipeable renderRightActions={() => (isAdmin ? renderRightActions(item) : null)}>
        <TouchableOpacity onPress={() => router.push(`/service/hotels/${item.id}`)} activeOpacity={0.7}>
          <Card style={styles.hotelCard}>
            <View style={styles.cardContent}>
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                  <FontAwesome5 name="hotel" size={32} color="#FFF" />
                </View>
              )}

              <View style={styles.hotelInfo}>
                <Text style={styles.hotelName} numberOfLines={2}>
                  {item.name}
                </Text>

                <View style={styles.locationRow}>
                  <FontAwesome5 name="map-marker-alt" size={12} color="#666" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.address ? `${item.city}, ${item.state} — ${item.address}` : `${item.city}, ${item.state}`}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>From</Text>
                    <Text style={styles.priceValue}>₦{lowest?.toLocaleString() ?? "—"}</Text>
                    <Text style={styles.priceUnit}>/night</Text>
                  </View>

                  <View style={styles.ratingContainer}>
                    {Array.from({ length: item.starRating || 3 }).map((_, i) => (
                      <FontAwesome5 key={i} name="star" size={12} color="#FFB800" />
                    ))}
                    <Text style={styles.ratingText}>{"★".repeat(Math.floor(item.rating ?? 0))}</Text>

                  </View>
                </View>

                <View style={styles.extrasRow}>
                  {item.extras?.wifi && <Chip small style={styles.extraChip}>WiFi</Chip>}
                  {item.extras?.pool && <Chip small style={styles.extraChip}>Pool</Chip>}
                  {item.extras?.breakfast && <Chip small style={styles.extraChip}>Breakfast</Chip>}
                  {item.extras?.light247 && <Chip small style={styles.extraChip}>24/7 Light</Chip>}
                </View>

                <Button
                  mode="contained"
                  compact
                  style={styles.bookButton}
                  labelStyle={styles.bookButtonLabel}
                  onPress={() => router.push(`/service/hotels/${item.id}`)}
                >
                  Book Now
                </Button>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </Swipeable>
    );
  };

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
        placeholder="Search hotels, cities or tags..."
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
                icon="calendar-check"
                onPress={() => router.push("/service/hotels/admin/admin-booking")}
                style={styles.adminActionBtn}
                labelStyle={styles.adminActionLabel}
              >
                Bookings
              </Button>
              <Button
                mode="outlined"
                icon="chart-line"
                onPress={() => router.push("/service/hotels/admin/admin-analytics")}
                style={styles.adminActionBtn}
                labelStyle={styles.adminActionLabel}
              >
                Analytics
              </Button>
            </View>

            <View style={styles.divider} />

            <Text style={styles.adminSubtitle}>Add New Hotel</Text>

            <Button icon="image" mode="outlined" onPress={pickImage} style={styles.imageButton} labelStyle={{ fontSize: 13 }}>
              {image ? "Change Image" : "Select Hotel Image"}
            </Button>

            {image && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImage(null)}>
                  <FontAwesome5 name="times-circle" size={24} color={ERROR_COLOR} />
                </TouchableOpacity>
              </View>
            )}

            <TextInput mode="outlined" label="Hotel Name *" value={newHotel.name} onChangeText={(t) => setNewHotel((p) => ({ ...p, name: t }))} style={styles.input} />

            {/* Address */}
            <TextInput mode="outlined" label="Address (Street / Landmark)" value={newHotel.address} onChangeText={(t) => setNewHotel((p) => ({ ...p, address: t }))} style={styles.input} />

            <TextInput mode="outlined" label="State *" value={newHotel.state} onChangeText={(t) => setNewHotel((p) => ({ ...p, state: t }))} style={styles.input} />
            <TextInput mode="outlined" label="City *" value={newHotel.city} onChangeText={(t) => setNewHotel((p) => ({ ...p, city: t }))} style={styles.input} />

            {/* Star rating */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 }}>Hotel Type (Star Rating)</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[2, 3, 4, 5].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setNewHotel((p) => ({ ...p, starRating: s }))}
                    style={[
                      { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
                      newHotel.starRating === s ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR } : { borderColor: "#E0E0E0", backgroundColor: "#fff" },
                    ]}
                  >
                    <Text style={newHotel.starRating === s ? { color: "#fff", fontWeight: "700" } : { color: "#333", fontWeight: "600" }}>{s}-star</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Extras */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 }}>Extras</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Chip selected={!!newHotel.extras?.pool} onPress={() => toggleExtra("pool")} style={styles.extraToggleChip}>Swimming Pool</Chip>
                <Chip selected={!!newHotel.extras?.wifi} onPress={() => toggleExtra("wifi")} style={styles.extraToggleChip}>WiFi</Chip>
                <Chip selected={!!newHotel.extras?.breakfast} onPress={() => toggleExtra("breakfast")} style={styles.extraToggleChip}>Free Breakfast</Chip>
                <Chip selected={!!newHotel.extras?.light247} onPress={() => toggleExtra("light247")} style={styles.extraToggleChip}>24/7 Light</Chip>
              </View>
            </View>

            {/* Room types UI */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 }}>Room Types (add manually)</Text>

              {/* existing room types */}
              {(newHotel.roomTypes || []).map((rt, idx) => (
                <View key={`${rt.type}-${idx}`} style={styles.roomTypeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700" }}>{rt.type}</Text>
                    <Text style={{ color: "#666" }}>₦{rt.price.toLocaleString()}</Text>
                  </View>
                  <Pressable onPress={() => removeRoomType(idx)} style={styles.removeRoomBtn}>
                    <FontAwesome5 name="times" size={14} color={ERROR_COLOR} />
                  </Pressable>
                </View>
              ))}

              {/* add room type inputs */}
              <View style={styles.roomAddRow}>
                <TextInput
                  mode="outlined"
                  placeholder="Room type (e.g. Standard)"
                  value={roomTypeName}
                  onChangeText={setRoomTypeName}
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  mode="outlined"
                  placeholder="Price"
                  keyboardType="numeric"
                  value={roomTypePrice}
                  onChangeText={setRoomTypePrice}
                  style={[styles.input, { width: 120 }]}
                />
              </View>
              <Button mode="outlined" onPress={addRoomTypeToList} style={{ marginTop: 8 }}>
                Add Room Type
              </Button>
            </View>

            <TextInput mode="outlined" label="Description" multiline numberOfLines={3} value={newHotel.description} onChangeText={(t) => setNewHotel((p) => ({ ...p, description: t }))} style={styles.input} />

            <Button mode="contained" loading={uploading} disabled={uploading} onPress={addHotel} style={styles.uploadButton} icon="upload">
              {uploading ? "Uploading..." : "Add Hotel"}
            </Button>
          </Card.Content>
        </Card>
      )}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filtered.length} {filtered.length === 1 ? "Hotel" : "Hotels"} Available
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
          headerTitle: "Hotels",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.back()}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" style={{ paddingLeft: 5 }} />
              </Pressable>
            );
          },
          headerRight: () => (
            <Pressable onPress={() => router.push("/profile/transaction-history")} style={{ paddingLeft: 8 }}>
              <FontAwesome5 name="history" size={20} color="#fff" />
            </Pressable>
          ),
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading hotels...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id!}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshBalance} colors={[PRIMARY_COLOR]} />}
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="hotel" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No Hotels Found</Text>
              <Text style={styles.emptyText}>{search || filterState || filterCity ? "Try adjusting your filters" : "No hotels available at the moment"}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SCREEN_BG,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },

  balanceCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
  },
  balanceContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "500",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceAmount: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: {
    backgroundColor: CARD_BG,
    marginBottom: 16,
  },
  filtersSection: {
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  clearChip: { height: 28 },
  filterScroll: { paddingVertical: 4 },
  filterChip: { marginRight: 8, backgroundColor: CARD_BG },
  filterChipActive: { backgroundColor: PRIMARY_COLOR },
  filterChipTextActive: { color: "#FFF" },
  resultsHeader: { paddingVertical: 12 },
  resultsText: { fontSize: 16, fontWeight: "600", color: "#333" },

  hotelCard: { marginBottom: 16, borderRadius: 16, elevation: 3, backgroundColor: CARD_BG },
  cardContent: { flexDirection: "row", padding: 12 },
  thumbnail: { width: 120, height: 120, borderRadius: 12, marginRight: 12 },
  thumbnailPlaceholder: { backgroundColor: PRIMARY_COLOR, justifyContent: "center", alignItems: "center" },
  hotelInfo: { flex: 1, justifyContent: "space-between" },
  hotelName: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  locationText: { fontSize: 13, color: "#666", flex: 1 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  priceContainer: { flexDirection: "row", alignItems: "baseline" },
  priceLabel: { fontSize: 11, color: "#666", marginRight: 4 },
  priceValue: { fontSize: 18, fontWeight: "bold", color: PRIMARY_COLOR },
  priceUnit: { fontSize: 11, color: "#666", marginLeft: 2 },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingText: { fontSize: 13, fontWeight: "600", color: "#333" },
  bookButton: { borderRadius: 8, elevation: 0 },
  bookButtonLabel: { fontSize: 13 },
  deleteAction: { backgroundColor: ERROR_COLOR, justifyContent: "center", alignItems: "center", width: 80, marginVertical: 8, marginRight: 16, borderRadius: 16 },
  deleteText: { color: "#FFF", fontSize: 12, fontWeight: "600", marginTop: 4 },
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
  input: { marginBottom: 12, backgroundColor: CARD_BG },
  uploadButton: { marginTop: 8, borderRadius: 12 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },

  // extras chips & room type UI
  extrasRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  extraChip: { backgroundColor: "#F5F5F5", marginRight: 6, marginBottom: 6 },
  extraToggleChip: { height: 36, marginRight: 8 },

  roomTypeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", padding: 10, borderRadius: 10, marginBottom: 8 },
  removeRoomBtn: { padding: 8 },
  roomAddRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
});
