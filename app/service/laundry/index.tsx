// laundry/index.tsx - Improved Styling
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
  View
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

  // Render delete action
  const renderRightActions = (item: LaundryService) => (
    <TouchableOpacity
      onPress={() => deleteLaundry(item.id!, item.name)}
      style={styles.deleteAction}
    >
      <FontAwesome5 name="trash" size={20} color="#FFF" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  // Render item
  const renderItem = ({ item }: { item: LaundryService }) => (
    <Swipeable
      renderRightActions={() => isAdmin ? renderRightActions(item) : null}
    >
      <TouchableOpacity
        onPress={() => openDetails(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.serviceCard}>
          <View style={styles.cardContent}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                <FontAwesome5 name="tshirt" size={32} color="#FFF" />
              </View>
            )}

            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={2}>{item.name}</Text>

              <View style={styles.locationRow}>
                <FontAwesome5 name="map-marker-alt" size={12} color="#666" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.city}, {item.state}
                </Text>
              </View>

              <View style={styles.priceRow}>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>From</Text>
                  <Text style={styles.priceValue}>₦{item.price?.toLocaleString()}</Text>
                  <Text style={styles.priceUnit}>/item</Text>
                </View>

                <View style={styles.ratingContainer}>
                  <FontAwesome5 name="star" size={14} color="#FFB800" solid />
                  <Text style={styles.ratingText}>{item.rating ?? "—"}</Text>
                </View>
              </View>

              <Button
                mode="contained"
                compact
                style={styles.bookButton}
                labelStyle={styles.bookButtonLabel}
                onPress={() => openDetails(item)}
                icon="check-circle"
              >
                Book Service
              </Button>
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
        placeholder="Search laundry, cleaners or tags..."
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
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
                onPress={() => router.push("/service/laundry/admin/admin-orders")}
                style={styles.adminActionBtn}
                labelStyle={styles.adminActionLabel}
              >
                Orders
              </Button>
              <Button
                mode="outlined"
                icon="chart-line"
                onPress={() => router.push("/service/laundry/admin/admin-analytics")}
                style={styles.adminActionBtn}
                labelStyle={styles.adminActionLabel}
              >
                Analytics
              </Button>
            </View>

            <View style={styles.divider} />

            <Text style={styles.adminSubtitle}>Add New Laundry Shop</Text>

            <Button
              icon="image"
              mode="outlined"
              onPress={pickImage}
              style={styles.imageButton}
              labelStyle={{ fontSize: 13 }}
            >
              {image ? "Change Image" : "Select Shop Image"}
            </Button>

            {image && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImage(null)}
                >
                  <FontAwesome5 name="times-circle" size={24} color={ERROR_COLOR} />
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              mode="outlined"
              label="Shop Name *"
              value={newLaundry.name}
              onChangeText={(t) => setNewLaundry((p) => ({ ...p, name: t }))}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Base Price (₦) *"
              keyboardType="numeric"
              value={newLaundry.price?.toString() ?? ""}
              onChangeText={(t) => setNewLaundry((p) => ({ ...p, price: Number(t) }))}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="State *"
              value={newLaundry.state}
              onChangeText={(t) => setNewLaundry((p) => ({ ...p, state: t }))}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="City *"
              value={newLaundry.city}
              onChangeText={(t) => setNewLaundry((p) => ({ ...p, city: t }))}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Description"
              multiline
              numberOfLines={3}
              value={newLaundry.description}
              onChangeText={(t) => setNewLaundry((p) => ({ ...p, description: t }))}
              style={styles.input}
            />

            <Button
              mode="contained"
              loading={uploading}
              disabled={uploading}
              onPress={addLaundry}
              style={styles.uploadButton}
              icon="upload"
            >
              {uploading ? "Uploading..." : "Add Laundry Shop"}
            </Button>
          </Card.Content>
        </Card>
      )}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filtered.length} {filtered.length === 1 ? 'Service' : 'Services'} Available
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
     =<Stack.Screen
             options={{
               headerShown: true,
               headerBackVisible: false,
               headerTitle: "Laundry Services",
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id!}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshBalance}
              colors={[PRIMARY_COLOR]}
            />
          }
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="tshirt" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No Laundry Services Found</Text>
              <Text style={styles.emptyText}>
                {search || filterState || filterCity
                  ? "Try adjusting your filters"
                  : "No laundry services available at the moment"}
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

  // Balance Card
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

  // Search
  searchInput: {
    backgroundColor: BACKGROUND_COLOR,
    marginBottom: 16,
  },

  // Filters
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
  clearChip: {
    height: 28,
  },
  filterScroll: {
    paddingVertical: 4,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: BACKGROUND_COLOR,
  },
  filterChipActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  filterChipTextActive: {
    color: "#FFF",
  },

  // Results
  resultsHeader: {
    paddingVertical: 12,
  },
  resultsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  // Service Cards
  serviceCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 3,
    backgroundColor: BACKGROUND_COLOR,
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceLabel: {
    fontSize: 11,
    color: "#666",
    marginRight: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  priceUnit: {
    fontSize: 11,
    color: "#666",
    marginLeft: 2,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  bookButton: {
    borderRadius: 8,
    elevation: 0,
  },
  bookButtonLabel: {
    fontSize: 13,
  },

  // Delete Action
  deleteAction: {
    backgroundColor: ERROR_COLOR,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginVertical: 8,
    marginRight: 16,
    borderRadius: 16,
  },
  deleteText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },

  // Admin Section
  adminCard: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  adminActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  adminActionBtn: {
    flex: 1,
    borderColor: PRIMARY_COLOR,
  },
  adminActionLabel: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: PRIMARY_COLOR + "30",
    marginVertical: 16,
  },
  adminSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    marginBottom: 12,
  },
  imageButton: {
    marginBottom: 12,
  },
  imagePreview: {
    position: "relative",
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFF",
    borderRadius: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: BACKGROUND_COLOR,
  },
  uploadButton: {
    marginTop: 8,
    borderRadius: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
});