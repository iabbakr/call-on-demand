import { router, Stack } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  onSnapshot,
  query,
  where
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
  Dialog,
  IconButton,
  Portal,
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

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

type Hotel = {
  id: string;
  name: string;
  category: string;
  state: string;
  city?: string;
  price: number;
  rating?: number;
  thumbnail?: string;
  description?: string;
  tags?: string[];
};

export default function Hotels() {
  const { user } = useAuth();
  const { userProfile, balance, refreshBalance } = useApp();

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<StateName | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [showDialog, setShowDialog] = useState(false);
  const [newHotel, setNewHotel] = useState<Partial<Hotel>>({
    name: "",
    price: 0,
    state: "",
    city: "",
    description: "",
    thumbnail: "",
  });

  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "services"), where("category", "==", "hotel"));
    const unsub = onSnapshot(q, (snap) => {
      setHotels(snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) } as Hotel)));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (userProfile?.location) setFilterState(userProfile.location as StateName);
  }, [userProfile?.location]);

  const filteredHotels = useMemo(() => {
    let out = [...hotels];
    if (filterState) out = out.filter(h => h.state.toLowerCase() === filterState.toLowerCase());
    if (filterCity) out = out.filter(h => (h.city || "").toLowerCase() === filterCity.toLowerCase());
    if (search.trim())
      out = out.filter(h =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        (h.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
      );
    return out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.price - b.price);
  }, [hotels, filterState, filterCity, search]);

  const addHotel = async () => {
    if (!newHotel.name || !newHotel.state || !newHotel.price || !newHotel.city) {
      return Alert.alert("Missing fields", "Please fill all required fields.");
    }
    try {
      await addDoc(collection(db, "services"), { ...newHotel, category: "hotel", createdAt: new Date() });
      setNewHotel({ name: "", price: 0, state: "", city: "", description: "", thumbnail: "" });
      setShowDialog(false);
      Alert.alert("Success", "Hotel added successfully!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to add hotel.");
    }
  };

  const deleteHotel = async (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteDoc(doc(db, "services", id));
          Alert.alert("Deleted", "Hotel removed.");
        } catch (err) {
          console.error(err);
          Alert.alert("Error", "Failed to delete hotel.");
        }
      }}
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Hotel }) => (
    <TouchableOpacity onPress={() => router.push(`/services/hotels/${item.id}`)}>
      <Card style={styles.card}>
        <View style={{ flexDirection: "row" }}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.ph]}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>H</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.city ? `${item.city}, ` : ""}
              {item.state} • ₦{item.price.toLocaleString()}/night
            </Text>
            <Text numberOfLines={2} style={styles.desc}>{item.description}</Text>
            <View style={styles.actionRow}>
              {isAdmin ? (
                <Button compact mode="contained" onPress={() => deleteHotel(item.id)}>Delete</Button>
              ) : (
                <Button compact mode="contained" onPress={() => router.push(`/services/hotels/${item.id}`)}>View</Button>
              )}
              <Text>⭐ {item.rating ?? "—"}</Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const cities = filterState ? getCitiesByState(filterState) : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, headerTitle: "Hotels" }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Hotels</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text>Wallet: ₦{balance.toLocaleString()}</Text>
            <IconButton icon="refresh" onPress={refreshBalance} size={20} />
          </View>
        </View>

        {isAdmin && (
          <View style={styles.adminSection}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Button icon="plus" mode="contained" onPress={() => setShowDialog(true)}>Add Hotel</Button>
              <Button mode="outlined" onPress={() => router.push("/services/hotels/admin/admin-booking")}>Bookings</Button>
              <Button mode="outlined" onPress={() => router.push("/services/hotels/admin/admin-analytics")}>Analytics</Button>
            </View>
          </View>
        )}

        <TextInput placeholder="Search hotels..." value={search} onChangeText={setSearch} style={styles.search} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
          {["All", ...getStates()].map(state => (
            <TouchableOpacity key={state} onPress={() => setFilterState(state === "All" ? null : (state as StateName))}>
              <Text style={[styles.filterBtn, (filterState === state || (state === "All" && !filterState)) && styles.filterActive]}>{state}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filterState && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {["All", ...cities].map(city => (
              <TouchableOpacity key={city} onPress={() => setFilterCity(city === "All" ? null : city)}>
                <Text style={[styles.filterBtn, (filterCity === city || (city === "All" && !filterCity)) && styles.filterActive]}>{city}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {loading ? <ActivityIndicator animating style={{ marginTop: 20 }} /> : (
          <FlatList
            data={filteredHotels}
            keyExtractor={i => i.id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<View style={{ padding: 20 }}><Text>No hotels found.</Text></View>}
          />
        )}
      </View>

      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Title>Add New Hotel</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Hotel Name" value={newHotel.name} onChangeText={v => setNewHotel({ ...newHotel, name: v })} style={{ marginBottom: 8 }} />
            <TextInput label="Price (₦)" keyboardType="numeric" value={newHotel.price?.toString()} onChangeText={v => setNewHotel({ ...newHotel, price: Number(v) })} style={{ marginBottom: 8 }} />
            <TextInput label="Description" multiline value={newHotel.description} onChangeText={v => setNewHotel({ ...newHotel, description: v })} style={{ marginBottom: 8 }} />
            <TextInput label="Thumbnail URL" value={newHotel.thumbnail} onChangeText={v => setNewHotel({ ...newHotel, thumbnail: v })} style={{ marginBottom: 8 }} />
            <TextInput label="State" value={newHotel.state} onChangeText={v => setNewHotel({ ...newHotel, state: v })} style={{ marginBottom: 8 }} />
            <TextInput label="City" value={newHotel.city} onChangeText={v => setNewHotel({ ...newHotel, city: v })} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>Cancel</Button>
            <Button onPress={addHotel}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: BACKGROUND_COLOR },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "700", color: PRIMARY_COLOR },
  search: { marginVertical: 8, backgroundColor: "#fff", paddingHorizontal: 12 },
  filterBtn: { marginRight: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#f3f3f3" },
  filterActive: { backgroundColor: PRIMARY_COLOR, color: "#fff", fontWeight: "700" },
  card: {
    marginVertical: 6,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  thumb: { width: 88, height: 88, borderRadius: 8, marginRight: 12 },
  ph: { backgroundColor: PRIMARY_COLOR, justifyContent: "center", alignItems: "center" },
  name: { fontWeight: "700" },
  meta: { color: "#666", marginTop: 4 },
  desc: { color: "#444", marginTop: 6 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  adminSection: { marginBottom: 12 },
});
