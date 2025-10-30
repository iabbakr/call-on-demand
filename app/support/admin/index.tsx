import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { Text } from "react-native-paper";
import { db } from "../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";

export default function AdminInbox() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "adminInbox"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ userId: doc.id, ...doc.data() }));
      setChats(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ✅ Format time intelligently
  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const handleOpenChat = async (item: any) => {
    try {
      // ✅ Reset unreadCount when admin opens the chat
      const chatRef = doc(db, "adminInbox", item.userId);
      await updateDoc(chatRef, { unreadCount: 0 });

      router.push({
        pathname: "/support/admin/[userId]",
        params: {
          userId: item.userId,
          userEmail: item.userEmail,
          userName: item.userName || item.userEmail,
        },
      });
    } catch (error) {
      console.error("Error resetting unreadCount:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Support Inbox</Text>

      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No messages yet</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <Pressable style={styles.chatItem} onPress={() => handleOpenChat(item)}>
              <View style={styles.avatarContainer}>
                <MaterialIcons name="person" size={32} color="#fff" />
              </View>

              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.userName}>
                    {item.userName || item.userEmail}
                  </Text>
                  <Text style={styles.time}>
                    {formatTime(item.lastMessageTime || item.updatedAt)}
                  </Text>
                </View>

                <View style={styles.messageRow}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage || "No messages yet"}
                  </Text>

                  {item.unreadCount && item.unreadCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 16, fontSize: 16, color: "#999" },
  chatItem: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chatContent: { flex: 1 },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  userName: { fontSize: 16, fontWeight: "600", color: "#222" },
  time: { fontSize: 12, color: "#999" },
  messageRow: { flexDirection: "row", alignItems: "center" },
  lastMessage: { flex: 1, fontSize: 14, color: "#666" },
  badge: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
});
