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
  Chip,
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
  mealType?: "Breakfast" | "Lunch" | "Dinner";
  priceCategory?: "Budget" | "Standard" | "Premium";
  cuisineType?: "Local" | "Continental" | "Fusion Special";
};

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";

export default function FoodServices() {
  const { user } = useAuth();
  const {
    userProfile,
    balance,
    deductBalance,
    addTransaction,
    refreshBalance,
  } = useApp();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<StateName | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Multi-select filters
  const [filterMeal, setFilterMeal] = useState<string[]>([]);
  const [filterPrice, setFilterPrice] = useState<string[]>([]);
  const [filterCuisine, setFilterCuisine] = useState<string[]>([]);

  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const [newFood, setNewFood] = useState<Partial<Service>>({
    name: "",
    state: "",
    city: "",
    price: 0,
    description: "",
    mealType: "Lunch",
    priceCategory: "Standard",
    cuisineType: "Local",
  });

  const isAdmin = userProfile?.role === "admin";

  // Fetch food list
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

  // Generic toggle for multi-select filters
  const toggleFilter = (filter: string[], value: string, setFilter: any) => {
    if (filter.includes(value)) {
      setFilter(filter.filter((f) => f !== value));
    } else {
      setFilter([...filter, value]);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterState(null);
    setFilterCity(null);
    setFilterMeal([]);
    setFilterPrice([]);
    setFilterCuisine([]);
    setSearch("");
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterState) count++;
    if (filterCity) count++;
    if (filterMeal.length > 0) count += filterMeal.length;
    if (filterPrice.length > 0) count += filterPrice.length;
    if (filterCuisine.length > 0) count += filterCuisine.length;
    return count;
  }, [filterState, filterCity, filterMeal, filterPrice, filterCuisine]);

  // Filtered services
  const filtered = useMemo(() => {
    let list = services;
    if (filterState) list = list.filter((s) => s.state === filterState);
    if (filterCity) list = list.filter((s) => s.city === filterCity);

    if (filterMeal.length > 0)
      list = list.filter((s) => filterMeal.includes(s.mealType!));
    if (filterPrice.length > 0)
      list = list.filter((s) => filterPrice.includes(s.priceCategory!));
    if (filterCuisine.length > 0)
      list = list.filter((s) => filterCuisine.includes(s.cuisineType!));

    if (search.trim())
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.tags || []).some((t) =>
            t.toLowerCase().includes(search.toLowerCase())
          )
      );
    return list;
  }, [
    services,
    filterState,
    filterCity,
    filterMeal,
    filterPrice,
    filterCuisine,
    search,
  ]);

  // Pick image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // Upload image to Cloudinary
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

  // Add food with push notification
  const addFood = async () => {
    if (
      !newFood.name ||
      !newFood.state ||
      !newFood.city ||
      !newFood.price ||
      !newFood.mealType ||
      !newFood.priceCategory ||
      !newFood.cuisineType
    ) {
      return Alert.alert("Missing fields", "Please fill all required fields.");
    }
    setUploading(true);
    try {
      let imageUrl = "";
      if (image) {
        imageUrl = await uploadToCloudinary(image);
      }

      const foodDocRef = await addDoc(collection(db, "services"), {
        ...newFood,
        category: "food",
        thumbnail: imageUrl,
        createdAt: Date.now(),
      });

      try {
        await notifyUsers(
          { state: newFood.state, city: newFood.city },
          {
            title: "New Food Available 🍲",
            body: `${newFood.name} (${newFood.mealType}) is now available in ${newFood.city}, ${newFood.state}!`,
            data: { foodId: foodDocRef.id, category: "food" },
          }
        );
      } catch (notifErr) {
        console.error("Failed to send notifications:", notifErr);
      }

      Alert.alert("✅ Food added successfully");
      setNewFood({
        name: "",
        state: "",
        city: "",
        price: 0,
        description: "",
        mealType: "Lunch",
        priceCategory: "Standard",
        cuisineType: "Local",
      });
      setImage(null);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not add food");
    } finally {
      setUploading(false);
    }
  };

  // Delete food
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

  // Render list item with improved design
  const renderItem = ({ item }: { item: Service }) => (
    <Swipeable
      renderRightActions={() =>
        isAdmin ? (
          <TouchableOpacity
            onPress={() => deleteFood(item.id!, item.name)}
            style={styles.deleteAction}
          >
            <FontAwesome5 name="trash" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null
      }
    >
      <TouchableOpacity onPress={() => router.push(`/service/food/${item.id}`)}>
        <Card style={styles.foodCard}>
          {item.thumbnail && (
            <Card.Cover source={{ uri: item.thumbnail }} style={styles.cardCover} />
          )}
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.foodName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.ratingBadge}>
                <FontAwesome5 name="star" size={12} color="#FFC107" solid />
                <Text style={styles.ratingText}>{item.rating ?? "—"}</Text>
              </View>
            </View>

            <View style={styles.tagsRow}>
              <Chip
                icon={() => <FontAwesome5 name="utensils" size={10} color={PRIMARY_COLOR} />}
                compact
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {item.mealType}
              </Chip>
              <Chip compact style={styles.chip} textStyle={styles.chipText}>
                {item.cuisineType}
              </Chip>
              <Chip compact style={styles.chip} textStyle={styles.chipText}>
                {item.priceCategory}
              </Chip>
            </View>

            <View style={styles.locationRow}>
              <FontAwesome5 name="map-marker-alt" size={12} color="#666" />
              <Text style={styles.locationText}>
                {item.city}, {item.state}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.priceText}>₦{item.price?.toLocaleString()}</Text>
              <Button
                mode="contained"
                compact
                onPress={() => router.push(`/service/food/${item.id}`)}
                style={styles.checkoutBtn}
                labelStyle={styles.checkoutBtnLabel}
              >
                Order Now
              </Button>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </Swipeable>
  );

  const Header = (
    <View style={styles.headerContainer}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>🍲 Food & Delivery</Text>
        <Text style={styles.heroSubtitle}>
          Delicious meals delivered to your doorstep
        </Text>
      </View>

      {/* Balance Card */}
      <Card style={styles.balanceCard}>
        <View style={styles.balanceContent}>
          <View>
            <Text style={styles.balanceLabel}>Wallet Balance</Text>
            <View style={styles.balanceRow}>
              <FontAwesome5 name="wallet" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.balanceAmount}>
                ₦{balance.toLocaleString()}
              </Text>
            </View>
          </View>
          <IconButton
            icon="refresh"
            iconColor={PRIMARY_COLOR}
            size={24}
            onPress={refreshBalance}
            style={styles.refreshBtn}
          />
        </View>
      </Card>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search meals, restaurants..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={
            search ? (
              <TextInput.Icon icon="close" onPress={() => setSearch("")} />
            ) : null
          }
        />
      </View>

      {/* Filter Toggle */}
      <View style={styles.filterToggleRow}>
        <Button
          mode={showFilters ? "contained" : "outlined"}
          onPress={() => setShowFilters(!showFilters)}
          icon="filter-variant"
          style={styles.filterToggleBtn}
        >
          Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>
        {activeFiltersCount > 0 && (
          <Button
            mode="text"
            onPress={clearFilters}
            textColor="#666"
            style={{ marginLeft: 8 }}
          >
            Clear All
          </Button>
        )}
      </View>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersScroll}
        >
          {filterState && (
            <Chip
              onClose={() => setFilterState(null)}
              style={styles.activeChip}
              textStyle={styles.activeChipText}
            >
              {filterState}
            </Chip>
          )}
          {filterCity && (
            <Chip
              onClose={() => setFilterCity(null)}
              style={styles.activeChip}
              textStyle={styles.activeChipText}
            >
              {filterCity}
            </Chip>
          )}
          {filterMeal.map((m) => (
            <Chip
              key={m}
              onClose={() => toggleFilter(filterMeal, m, setFilterMeal)}
              style={styles.activeChip}
              textStyle={styles.activeChipText}
            >
              {m}
            </Chip>
          ))}
          {filterPrice.map((p) => (
            <Chip
              key={p}
              onClose={() => toggleFilter(filterPrice, p, setFilterPrice)}
              style={styles.activeChip}
              textStyle={styles.activeChipText}
            >
              {p}
            </Chip>
          ))}
          {filterCuisine.map((c) => (
            <Chip
              key={c}
              onClose={() => toggleFilter(filterCuisine, c, setFilterCuisine)}
              style={styles.activeChip}
              textStyle={styles.activeChipText}
            >
              {c}
            </Chip>
          ))}
        </ScrollView>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          {/* Meal Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>🍽️ Meal Type</Text>
            <View style={styles.chipGroup}>
              {["Breakfast", "Lunch", "Dinner"].map((m) => (
                <Chip
                  key={m}
                  selected={filterMeal.includes(m)}
                  onPress={() => toggleFilter(filterMeal, m, setFilterMeal)}
                  style={[
                    styles.filterChip,
                    filterMeal.includes(m) && styles.filterChipSelected,
                  ]}
                  textStyle={styles.filterChipText}
                >
                  {m}
                </Chip>
              ))}
            </View>
          </View>

          {/* Price Category Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>💰 Price Range</Text>
            <View style={styles.chipGroup}>
              {["Budget", "Standard", "Premium"].map((p) => (
                <Chip
                  key={p}
                  selected={filterPrice.includes(p)}
                  onPress={() => toggleFilter(filterPrice, p, setFilterPrice)}
                  style={[
                    styles.filterChip,
                    filterPrice.includes(p) && styles.filterChipSelected,
                  ]}
                  textStyle={styles.filterChipText}
                >
                  {p}
                </Chip>
              ))}
            </View>
          </View>

          {/* Cuisine Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>🌍 Cuisine</Text>
            <View style={styles.chipGroup}>
              {["Local", "Continental", "Fusion Special"].map((c) => (
                <Chip
                  key={c}
                  selected={filterCuisine.includes(c)}
                  onPress={() => toggleFilter(filterCuisine, c, setFilterCuisine)}
                  style={[
                    styles.filterChip,
                    filterCuisine.includes(c) && styles.filterChipSelected,
                  ]}
                  textStyle={styles.filterChipText}
                >
                  {c}
                </Chip>
              ))}
            </View>
          </View>

          {/* State Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>📍 State</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {getStates().map((s) => (
                <Chip
                  key={s}
                  selected={filterState === s}
                  onPress={() => setFilterState(s)}
                  style={[
                    styles.filterChip,
                    filterState === s && styles.filterChipSelected,
                  ]}
                  textStyle={styles.filterChipText}
                >
                  {s}
                </Chip>
              ))}
            </ScrollView>
          </View>

          {/* City Filter */}
          {filterState && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>🏙️ City</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
              >
                {getCitiesByState(filterState).map((c) => (
                  <Chip
                    key={c}
                    selected={filterCity === c}
                    onPress={() => setFilterCity(c)}
                    style={[
                      styles.filterChip,
                      filterCity === c && styles.filterChipSelected,
                    ]}
                    textStyle={styles.filterChipText}
                  >
                    {c}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filtered.length} {filtered.length === 1 ? "meal" : "meals"} found
        </Text>
      </View>

      {/* Admin Section - Keeping original for now */}
      {isAdmin && (
        <Card style={styles.adminCard}>
          <Card.Content>
            <Text style={styles.adminTitle}>⚙️ Admin Panel</Text>

            <View style={styles.adminActions}>
              <Button
                mode="outlined"
                icon="clipboard-list"
                onPress={() => router.push("/service/food/admin/admin-orders")}
                style={styles.adminBtn}
              >
                Orders
              </Button>
              <Button
                mode="outlined"
                icon="chart-line"
                onPress={() =>
                  router.push("/service/food/admin/admin-analytics")
                }
                style={styles.adminBtn}
              >
                Analytics
              </Button>
            </View>

            <Text style={styles.adminSubtitle}>Add New Food Item</Text>

            <Button
              icon="image-plus"
              mode="outlined"
              onPress={pickImage}
              style={styles.imageBtn}
            >
              {image ? "Change Image" : "Select Food Image"}
            </Button>

            {image && (
              <Image source={{ uri: image }} style={styles.previewImage} />
            )}

            <TextInput
              label="Food Name"
              value={newFood.name}
              onChangeText={(t) => setNewFood((p) => ({ ...p, name: t }))}
              style={styles.adminInput}
              mode="outlined"
            />
            <TextInput
              label="Price (₦)"
              keyboardType="numeric"
              value={newFood.price?.toString() ?? ""}
              onChangeText={(t) =>
                setNewFood((p) => ({ ...p, price: Number(t) }))
              }
              style={styles.adminInput}
              mode="outlined"
              left={<TextInput.Icon icon="currency-ngn" />}
            />
            <TextInput
              label="State"
              value={newFood.state}
              onChangeText={(t) => setNewFood((p) => ({ ...p, state: t }))}
              style={styles.adminInput}
              mode="outlined"
            />
            <TextInput
              label="City"
              value={newFood.city}
              onChangeText={(t) => setNewFood((p) => ({ ...p, city: t }))}
              style={styles.adminInput}
              mode="outlined"
            />
            <TextInput
              label="Description"
              multiline
              numberOfLines={3}
              value={newFood.description}
              onChangeText={(t) => setNewFood((p) => ({ ...p, description: t }))}
              style={styles.adminInput}
              mode="outlined"
            />

            {/* Meal Type Selection */}
            <Text style={styles.adminFieldLabel}>Meal Type</Text>
            <View style={styles.buttonGroup}>
              {["Breakfast", "Lunch", "Dinner"].map((type) => (
                <Button
                  key={type}
                  mode={newFood.mealType === type ? "contained" : "outlined"}
                  onPress={() =>
                    setNewFood((p) => ({ ...p, mealType: type as any }))
                  }
                  style={styles.groupButton}
                  compact
                >
                  {type}
                </Button>
              ))}
            </View>

            {/* Price Category Selection */}
            <Text style={styles.adminFieldLabel}>Price Category</Text>
            <View style={styles.buttonGroup}>
              {["Budget", "Standard", "Premium"].map((p) => (
                <Button
                  key={p}
                  mode={newFood.priceCategory === p ? "contained" : "outlined"}
                  onPress={() =>
                    setNewFood((prev) => ({ ...prev, priceCategory: p as any }))
                  }
                  style={styles.groupButton}
                  compact
                >
                  {p}
                </Button>
              ))}
            </View>

            {/* Cuisine Type Selection */}
            <Text style={styles.adminFieldLabel}>Cuisine Type</Text>
            <View style={styles.buttonGroup}>
              {["Local", "Continental", "Fusion Special"].map((c) => (
                <Button
                  key={c}
                  mode={newFood.cuisineType === c ? "contained" : "outlined"}
                  onPress={() =>
                    setNewFood((prev) => ({ ...prev, cuisineType: c as any }))
                  }
                  style={styles.groupButton}
                  compact
                >
                  {c}
                </Button>
              ))}
            </View>

            <Button
              mode="contained"
              loading={uploading}
              onPress={addFood}
              style={styles.uploadBtn}
              icon="upload"
            >
              {uploading ? "Uploading..." : "Add Food Item"}
            </Button>
          </Card.Content>
        </Card>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Food Services",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
        }}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading delicious meals...</Text>
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
              <FontAwesome5 name="utensils" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No meals found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your filters or search
              </Text>
              {activeFiltersCount > 0 && (
                <Button mode="outlined" onPress={clearFilters} style={{ marginTop: 16 }}>
                  Clear Filters
                </Button>
              )}
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    padding: 16,
  },
  heroSection: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  balanceCard: {
    marginBottom: 16,
    backgroundColor: ACCENT_COLOR,
    elevation: 0,
  },
  balanceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  refreshBtn: {
    backgroundColor: BACKGROUND_COLOR,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: BACKGROUND_COLOR,
  },
  filterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  filterToggleBtn: {
    flex: 1,
  },
  activeFiltersScroll: {
    marginBottom: 12,
  },
  activeChip: {
    marginRight: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  activeChipText: {
    color: BACKGROUND_COLOR,
    fontSize: 12,
  },
  filtersPanel: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#f5f5f5",
  },
  filterChipSelected: {
    backgroundColor: ACCENT_COLOR,
  },
  filterChipText: {
    fontSize: 13,
  },
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  resultsRow: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  resultsText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  foodCard: {
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 12,
    overflow: "hidden",
    
  },
  cardCover: {
    height: 180,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  foodName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F57C00",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    height: 28,
    backgroundColor: ACCENT_COLOR,
  },
  chipText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 13,
    color: "#666",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  priceText: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  checkoutBtn: {
    borderRadius: 8,
  },
  checkoutBtnLabel: {
    fontSize: 13,
  },
  deleteAction: {
    backgroundColor: "#D32F2F",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginVertical: 6,
    borderRadius: 12,
  },
  adminCard: {
    marginTop: 16,
    backgroundColor: "#F8F9FA",
    elevation: 2,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 16,
  },
  adminActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  adminBtn: {
    flex: 1,
  },
  adminSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  imageBtn: {
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  adminInput: {
    marginBottom: 12,
    backgroundColor: BACKGROUND_COLOR,
  },
  adminFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  groupButton: {
    flex: 1,
  },
  uploadBtn: {
    marginTop: 16,
    paddingVertical: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  listContainer: {
    paddingBottom: 80,
  },
});