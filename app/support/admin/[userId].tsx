import { useLocalSearchParams } from "expo-router";
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
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { Text } from "react-native-paper";
import { db } from "../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";

export default function AdminChatView() {
  const { userId, userEmail, userName } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
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
    if (!input.trim() || !userId) return;

    try {
      const messageData = {
        text: input,
        sender: "admin",
        createdAt: serverTimestamp(),
      };

      // ✅ Add message to chat subcollection
      await addDoc(collection(db, "chats", userId as string, "messages"), messageData);

      // ✅ Update metadata and adminInbox info
      const updateData = {
        userEmail,
        userName,
        lastMessage: input,
        lastMessageTime: serverTimestamp(),
        unreadCount: 0,
        updatedAt: serverTimestamp(),
      };

      await Promise.all([
        setDoc(doc(db, "chatMetadata", userId as string), updateData, { merge: true }),
        setDoc(doc(db, "adminInbox", userId as string), updateData, { merge: true }),
      ]);

      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Text style={styles.header}>Chat with {userName}</Text>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.sender === "admin" ? styles.adminBubble : styles.userBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: item.sender === "admin" ? "#fff" : "#000" },
              ]}
            >
              {item.text}
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 10 }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          style={styles.input}
        />
        <Pressable style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    padding: 15,
    fontSize: 18,
    fontWeight: "600",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  messageBubble: {
    marginVertical: 6,
    marginHorizontal: 10,
    padding: 10,
    borderRadius: 10,
    maxWidth: "80%",
  },
  adminBubble: {
    backgroundColor: PRIMARY_COLOR,
    alignSelf: "flex-end",
  },
  userBubble: {
    backgroundColor: "#eee",
    alignSelf: "flex-start",
  },
  messageText: { fontSize: 15 },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  sendButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    marginLeft: 8,
    borderRadius: 8,
    justifyContent: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "600",
  },
});
