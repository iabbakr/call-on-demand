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
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { db } from "../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const SCREEN_BG = "#F5F5F5";

export default function AdminInbox() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

    const isYesterday = () => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return (
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
      );
    };

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (isYesterday()) {
      return "Yesterday";
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

  // Filter chats based on search
  const filteredChats = chats.filter((chat) => {
    const searchLower = searchQuery.toLowerCase();
    const userName = (chat.userName || chat.userEmail || "").toLowerCase();
    const lastMessage = (chat.lastMessage || "").toLowerCase();
    return userName.includes(searchLower) || lastMessage.includes(searchLower);
  });

  // Calculate stats
  const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  const activeChats = chats.filter(chat => chat.lastMessage).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Support Inbox</Text>
            <Text style={styles.headerSubtitle}>
              {activeChats} active conversations
            </Text>
          </View>
          {totalUnread > 0 && (
            <View style={styles.headerBadge}>
              <MaterialIcons name="notifications-active" size={20} color="#fff" />
              <Text style={styles.headerBadgeText}>{totalUnread}</Text>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <MaterialIcons name="close" size={20} color="#999" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Chat List */}
      {filteredChats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <MaterialIcons name="inbox" size={64} color={PRIMARY_COLOR} />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? "No results found" : "No messages yet"}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? "Try adjusting your search"
              : "Customer support messages will appear here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const hasUnread = item.unreadCount && item.unreadCount > 0;
            
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.chatItem,
                  hasUnread && styles.chatItemUnread,
                  pressed && styles.chatItemPressed,
                ]}
                onPress={() => handleOpenChat(item)}
              >
                {/* Avatar */}
                <View style={[
                  styles.avatarContainer,
                  hasUnread && styles.avatarContainerUnread
                ]}>
                  <MaterialIcons name="person" size={28} color="#fff" />
                  {hasUnread && <View style={styles.avatarBadge} />}
                </View>

                {/* Chat Content */}
                <View style={styles.chatContent}>
                  <View style={styles.chatHeader}>
                    <Text style={[
                      styles.userName,
                      hasUnread && styles.userNameUnread
                    ]} numberOfLines={1}>
                      {item.userName || item.userEmail}
                    </Text>
                    <Text style={[
                      styles.time,
                      hasUnread && styles.timeUnread
                    ]}>
                      {formatTime(item.lastMessageTime || item.updatedAt)}
                    </Text>
                  </View>

                  <View style={styles.messageRow}>
                    <Text
                      style={[
                        styles.lastMessage,
                        hasUnread && styles.lastMessageUnread
                      ]}
                      numberOfLines={2}
                    >
                      {item.lastMessage || "No messages yet"}
                    </Text>

                    {hasUnread && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Chevron */}
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color="#ccc"
                  style={styles.chevron}
                />
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SCREEN_BG,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },

  // Header Styles
  header: {
    backgroundColor: PRIMARY_COLOR,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#fff",
    paddingVertical: 8,
  },

  // List
  listContent: {
    paddingVertical: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 82,
  },

  // Chat Item
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  chatItemUnread: {
    backgroundColor: ACCENT_COLOR + "30",
  },
  chatItemPressed: {
    backgroundColor: "#f5f5f5",
  },

  // Avatar
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },
  avatarContainerUnread: {
    backgroundColor: PRIMARY_COLOR,
    borderWidth: 2,
    borderColor: SUCCESS_COLOR,
  },
  avatarBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: SUCCESS_COLOR,
    borderWidth: 2,
    borderColor: "#fff",
  },

  // Chat Content
  chatContent: {
    flex: 1,
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  userNameUnread: {
    fontWeight: "700",
    color: "#000",
  },
  time: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  timeUnread: {
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },

  // Message Row
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  lastMessageUnread: {
    color: "#333",
    fontWeight: "500",
  },

  // Badge
  badge: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Chevron
  chevron: {
    marginLeft: 8,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ACCENT_COLOR + "40",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});