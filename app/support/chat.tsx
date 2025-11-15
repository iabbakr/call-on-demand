// Chat.tsx
import { Feather } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#F5F5F5";
const ADMIN_UID = "CVpVUr1bPwTwuaNlBb6K1eoeUbG3";

export default function Chat(): React.JSX.Element {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [adminTyping, setAdminTyping] = useState(false);
  const flatListRef = useRef<FlatList<any> | null>(null);

  const { user } = useAuth();

  // Loading guard
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={{ marginTop: 12 }}>Loading chat...</Text>
      </SafeAreaView>
    );
  }

  const userId = user.uid;

  // Listen for chat messages
  useEffect(() => {
    const q = query(
      collection(db, "chats", userId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });

    return () => unsub();
  }, [userId]);

  // Listen for admin typing status on chat doc
  useEffect(() => {
    const typingRef = doc(db, "chats", userId);
    const unsub = onSnapshot(typingRef, (docSnap) => {
      if (docSnap.exists()) {
        setAdminTyping(!!docSnap.data()?.adminTyping);
      }
    });

    return () => unsub();
  }, [userId]);

  // Send message
  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const messageData = {
      text: trimmed,
      senderId: userId,
      senderEmail: user.email,
      sender: "user",
      createdAt: serverTimestamp(),
    };

    try {
      // Add message to chat
      await addDoc(collection(db, "chats", userId, "messages"), messageData);

      // Update chat metadata
      await setDoc(
        doc(db, "chats", userId),
        {
          userEmail: user.email,
          userName: user.displayName || user.email,
          lastMessage: trimmed,
          lastMessageTime: serverTimestamp(),
          unreadCount: increment(1),
          updatedAt: serverTimestamp(),
          adminTyping: false,
        },
        { merge: true }
      );

      // Update admin inbox
      await setDoc(
        doc(db, "adminInbox", userId),
        {
          userEmail: user.email,
          userName: user.displayName || user.email,
          lastMessage: trimmed,
          lastMessageTime: serverTimestamp(),
          unreadCount: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setText("");
      Keyboard.dismiss();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    return isToday
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString();
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages]);

  // Animated typing dots
  const dotAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [dotAnim]);

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.sender === "user";
    return (
      <View style={[styles.messageContainer, isUser ? styles.userContainer : styles.adminContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.adminBubble]}>
          <Text style={[styles.sender, { color: isUser ? "#fff" : PRIMARY_COLOR }]}>
            {isUser ? "You" : "Admin"}
          </Text>

          <Text style={[styles.messageText, { color: isUser ? "#fff" : "#222" }]}>{item.text}</Text>

          <Text style={[styles.timestamp, { color: isUser ? "#eee" : "#888" }]}>
            {formatTimestamp(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  // Typing indicator component
  const TypingIndicator = () => {
    const opacity1 = dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
    const opacity2 = dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
    const opacity3 = dotAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] });

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDotsContainer}>
            <Animated.View style={[styles.typingDot, { opacity: opacity1 }]} />
            <Animated.View style={[styles.typingDot, { opacity: opacity2 }]} />
            <Animated.View style={[styles.typingDot, { opacity: opacity3 }]} />
          </View>
          <Text style={styles.typingText}>Admin is typing...</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 10 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={adminTyping ? <TypingIndicator /> : null}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Type your message..."
            value={text}
            onChangeText={setText}
            style={styles.input}
            multiline
          />
          <Pressable style={styles.sendButton} onPress={sendMessage} accessibilityLabel="Send message">
            <Feather name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  messageContainer: { paddingHorizontal: 10, marginVertical: 6 },
  userContainer: { alignItems: "flex-end" },
  adminContainer: { alignItems: "flex-start" },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: PRIMARY_COLOR,
    borderTopRightRadius: 0,
  },
  adminBubble: {
    backgroundColor: "#F0F0F0",
    borderTopLeftRadius: 0,
  },
  sender: { fontSize: 11, marginBottom: 6, fontWeight: "700" },
  messageText: { fontSize: 15, lineHeight: 20 },
  timestamp: { fontSize: 10, marginTop: 8, alignSelf: "flex-end" },

  // typing
  typingContainer: { paddingHorizontal: 10, paddingVertical: 6 },
  typingBubble: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6E1E5",
  },
  typingDotsContainer: { flexDirection: "row", marginRight: 10 },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: INACTIVE_COLOR,
    marginHorizontal: 4,
  },
  typingText: { fontSize: 13, fontStyle: "italic", color: INACTIVE_COLOR },

  // input
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopColor: "#ddd",
    borderTopWidth: 1,
    padding: 8,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
    backgroundColor: BACKGROUND_COLOR,
  },
  sendButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 10,
    borderRadius: 25,
  },
});
