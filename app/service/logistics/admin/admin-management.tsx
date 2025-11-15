import { Stack } from "expo-router";
import { collection, deleteDoc, doc, DocumentData, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { db } from "../../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";

type LogisticsPoint = {
  id?: string;
  name: string;
  state: string;
  city?: string;
  address?: string;
  phone?: string;
  thumbnail?: string;
  rating?: number;
};

export default function AdminManagement() {
  const [points, setPoints] = useState<LogisticsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = true; // replace with your auth check if needed

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "logistics_points"), (snap) => {
      const arr = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as DocumentData) } as LogisticsPoint)
      );
      setPoints(arr);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const deletePoint = async (id: string, name: string) => {
    const confirmed = confirm(`Delete ${name}?`);
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "logistics_points", id));
      alert(`${name} deleted successfully.`);
    } catch (err: any) {
      alert(err.message || "Failed to delete.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // you can refresh data from server if needed
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: LogisticsPoint }) => (
    <Card style={styles.card}>
      <TouchableOpacity>
        <View style={styles.row}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: PRIMARY_COLOR, justifyContent: "center", alignItems: "center" }]}>
              <Text style={{ color: "#fff" }}>🚚</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.city}, {item.state}</Text>
            <Text>⭐ {item.rating ?? "—"}</Text>
          </View>
          {isAdmin && (
            <Button mode="contained" color="red" onPress={() => deletePoint(item.id!, item.name)}>
              Delete
            </Button>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, headerTitle: "Admin Management" }} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={PRIMARY_COLOR} />
      ) : (
        <FlatList
          data={points}
          keyExtractor={(i) => i.id!}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80 }}
          ListEmptyComponent={<View style={{ padding: 20 }}><Text>No logistics points available.</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginVertical: 6, padding: 8 },
  row: { flexDirection: "row", alignItems: "center" },
  thumb: { width: 88, height: 88, borderRadius: 8, marginRight: 12 },
  name: { fontWeight: "700" },
  meta: { color: "#666", marginTop: 4 },
});
