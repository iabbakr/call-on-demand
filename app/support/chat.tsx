import { Feather } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, "supportChats"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(data);
    });
    return () => unsub();
  }, []);

  const sendMessage = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, "supportChats"), {
      text,
      sender: user?.email || "User",
      createdAt: serverTimestamp(),
    });
    setText("");
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isUser = item.sender === user?.email;
          return (
            <View
              style={[
                styles.messageContainer,
                isUser ? styles.userContainer : styles.agentContainer,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.agentBubble,
                ]}
              >
                <Text
                  style={[
                    styles.sender,
                    { color: isUser ? "#fff" : PRIMARY_COLOR },
                  ]}
                >
                  {isUser ? "You" : item.sender}
                </Text>
                <Text
                  style={[
                    styles.messageText,
                    { color: isUser ? "#fff" : "#222" },
                  ]}
                >
                  {item.text}
                </Text>
                <Text
                  style={[
                    styles.timestamp,
                    { color: isUser ? "#eee" : "#888" },
                  ]}
                >
                  {formatTimestamp(item.createdAt)}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={{ paddingVertical: 10 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Type your message..."
          value={text}
          onChangeText={setText}
          style={styles.input}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={sendMessage}>
          <Feather name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  messageContainer: { paddingHorizontal: 10, marginVertical: 4 },
  userContainer: { alignItems: "flex-end" },
  agentContainer: { alignItems: "flex-start" },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    maxWidth: "80%",
  },
  userBubble: {
    backgroundColor: PRIMARY_COLOR,
    borderTopRightRadius: 0,
  },
  agentBubble: {
    backgroundColor: "#F0F0F0",
    borderTopLeftRadius: 0,
  },
  sender: {
    fontSize: 11,
    marginBottom: 2,
    fontWeight: "bold",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 5,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopColor: "#ddd",
    borderTopWidth: 1,
    padding: 8,
    backgroundColor: BACKGROUND_COLOR,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 10,
    borderRadius: 25,
  },
});
