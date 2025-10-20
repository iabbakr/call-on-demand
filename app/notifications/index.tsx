import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notifications"), (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotifications(items);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator animating color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.notificationCard}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationBody}>{item.message}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No notifications yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 20,
  },
  notificationCard: {
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  notificationTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  notificationBody: {
    color: "#444",
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
