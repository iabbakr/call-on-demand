import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
const ADMIN_BUBBLE = "#6200EE";
const USER_BUBBLE = "#F0F0F0";
const SCREEN_BG = "#F5F5F5";

export default function AdminChatView() {
  const { userId, userEmail, userName } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!userId) return;

    // ✅ Listen for messages in this chat
    const q = query(
      collection(db, "chats", userId as string, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);

      // ✅ Auto-scroll to bottom whenever new messages appear
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    // ✅ Mark messages as read (reset unread count)
    const markAsRead = async () => {
      try {
        const inboxRef = doc(db, "adminInbox", userId as string);
        const metadataRef = doc(db, "chatMetadata", userId as string);

        await Promise.all([
          updateDoc(inboxRef, { unreadCount: 0 }),
          updateDoc(metadataRef, { unreadCount: 0 }),
        ]);
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    };

    markAsRead();

    return () => unsub();
  }, [userId]);

  const sendMessage = async () => {
    if (!input.trim() || !userId || sending) return;

    const messageText = input.trim();
    setInput("");
    setSending(true);

    try {
      const messageData = {
        text: messageText,
        sender: "admin",
        createdAt: serverTimestamp(),
      };

      // ✅ Add message to chat subcollection
      await addDoc(collection(db, "chats", userId as string, "messages"), messageData);

      // ✅ Update metadata and adminInbox info
      const updateData = {
        userEmail,
        userName,
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        unreadCount: 0,
        updatedAt: serverTimestamp(),
      };

      await Promise.all([
        setDoc(doc(db, "chatMetadata", userId as string), updateData, { merge: true }),
        setDoc(doc(db, "adminInbox", userId as string), updateData, { merge: true }),
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setInput(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    const today = new Date();
    
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) return "Today";

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return "Yesterday";

    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const renderDateSeparator = (currentMsg: any, prevMsg: any) => {
    if (!currentMsg.createdAt?.toDate) return null;
    
    const currentDate = currentMsg.createdAt.toDate().toDateString();
    const prevDate = prevMsg?.createdAt?.toDate()?.toDateString();
    
    if (currentDate !== prevDate) {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateText}>{formatDate(currentMsg.createdAt)}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        
        <View style={styles.headerInfo}>
          <View style={styles.avatarSmall}>
            <MaterialIcons name="person" size={20} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {userName || userEmail}
            </Text>
            <Text style={styles.headerSubtitle}>{userEmail}</Text>
          </View>
        </View>

        <Pressable style={styles.moreButton}>
          <MaterialIcons name="more-vert" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Messages */}
      <View style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="chat-bubble-outline" size={48} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>Start the conversation with {userName}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const isAdmin = item.sender === "admin";
              const prevMsg = index > 0 ? messages[index - 1] : null;
              
              return (
                <View>
                  {renderDateSeparator(item, prevMsg)}
                  <View style={[styles.messageWrapper, isAdmin && styles.messageWrapperAdmin]}>
                    <View
                      style={[
                        styles.messageBubble,
                        isAdmin ? styles.adminBubble : styles.userBubble,
                      ]}
                    >
                      <Text style={[styles.messageText, isAdmin && styles.adminText]}>
                        {item.text}
                      </Text>
                      <Text style={[styles.messageTime, isAdmin && styles.adminTime]}>
                        {formatTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}
      </View>

      {/* Input Container */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          <Pressable style={styles.attachButton}>
            <MaterialIcons name="attach-file" size={24} color="#666" />
          </Pressable>
          
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            style={styles.input}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          
          {input.trim().length > 0 ? (
            <Pressable
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="send" size={22} color="#fff" />
              )}
            </Pressable>
          ) : (
            <Pressable style={styles.micButton}>
              <MaterialIcons name="mic" size={24} color="#666" />
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  // Messages Container
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },

  // Date Separator
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
    marginHorizontal: 12,
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 8,
  },

  // Message Bubbles
  messageWrapper: {
    marginVertical: 4,
    alignItems: "flex-start",
  },
  messageWrapperAdmin: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  adminBubble: {
    backgroundColor: ADMIN_BUBBLE,
    borderBottomRightRadius: 4,
  },
  userBubble: {
    backgroundColor: USER_BUBBLE,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#333",
    marginBottom: 4,
  },
  adminText: {
    color: "#fff",
  },
  messageTime: {
    fontSize: 11,
    color: "#999",
    alignSelf: "flex-end",
  },
  adminTime: {
    color: "rgba(255,255,255,0.7)",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: ACCENT_COLOR + "40",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },

  // Input Container
  inputWrapper: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#F5F5F5",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  attachButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  micButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
});