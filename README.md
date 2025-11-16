# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.



VTPass live


apikeys= ae47a85e765d8ecafb1804c937af7245


public key = PK_865dea052ac96c9526f97ed28bb74bfa46a5fce67ef


secret key= SK_2186e02d9aa1e421b2ad467576bef3df1bc89b206db






Airtime Recharge 
 Airtel Airtime VTU
 MTN Airtime VTU
 GLO Airtime VTU
 T2 (9mobile) Airtime VTU
 Smile Network Payment
 International Airtime
Data Services 
 Airtel Data
 MTN Data
 GLO Data
 T2 (9mobile) Data
 Smile Payment
 GLO Data (SME)
Education 
 WAEC Result Checker PIN
 WAEC Registration PIN
 JAMB PIN VENDING (UTME & Direct Entry)
Electricity Bill 
 Ikeja Electric Payment - IKEDC
 Eko Electric Payment - EKEDC
 Abuja Electricity Distribution Company- AEDC
 KEDCO - Kano Electric
 PHED - Port Harcourt Electric
 Jos Electric - JED
 Kaduna Electric - KAEDCO
 Enugu Electric - EEDC
 IBEDC - Ibadan Electricity Distribution Company
 Benin Electricity - BEDC
 Aba Electric Payment - ABEDC
 Yola Electric Disco Payment - YEDC
Other Merchants/Services 
 SMSclone.com
 VTpass POS Terminal Payment
TV Subscription 
 DSTV Subscription
 Gotv Payment
 Startimes Subscription
 ShowMax




 {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <View>
            <Text style={styles.greetingText}>Welcome back,</Text>
            <Text style={styles.userName}>{userData?.fullName || "User"} 👋</Text>
          </View>
          <Pressable
            onPress={() => router.push("/profile")}
            style={styles.avatarContainer}
          >
            <FontAwesome5 name="user-circle" size={40} color={PRIMARY_COLOR} />
          </Pressable>
        </View>











        support chat


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
  setDoc
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
const ADMIN_UID = "CVpVUr1bPwTwuaNlBb6K1eoeUbG3";

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [adminTyping, setAdminTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text>Loading chat...</Text>
      </View>
    );
  }

  const userId = user.uid;

  // 🔹 Listen for chat messages
  useEffect(() => {
    const q = query(
      collection(db, "chats", userId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
    });

    return () => unsub();
  }, [userId]);

  // 🔹 Listen for admin typing status (from Firestore)
  useEffect(() => {
    const typingRef = doc(db, "chats", userId);
    const unsub = onSnapshot(typingRef, (docSnap) => {
      if (docSnap.exists()) {
        setAdminTyping(docSnap.data()?.adminTyping || false);
      }
    });

    return () => unsub();
  }, [userId]);

  // 🔹 Send message
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

      // Update chat document metadata
      await setDoc(
        doc(db, "chats", userId),
        {
          userEmail: user.email,
          userName: user.displayName || user.email,
          lastMessage: trimmed,
          lastMessageTime: serverTimestamp(),
          unreadCount: increment(1),
          updatedAt: serverTimestamp(),
          adminTyping: false, // reset typing if needed
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

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages]);

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
          const isUser = item.sender === "user";
          return (
            <View
              style={[
                styles.messageContainer,
                isUser ? styles.userContainer : styles.adminContainer,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.adminBubble,
                ]}
              >
                <Text
                  style={[
                    styles.sender,
                    { color: isUser ? "#fff" : PRIMARY_COLOR },
                  ]}
                >
                  {isUser ? "You" : "Admin"}
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
        ListFooterComponent={
          adminTyping ? (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>Admin is typing...</Text>
            </View>
          ) : null
        }
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
        <Pressable style={styles.sendButton} onPress={sendMessage}>
          <Feather name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageContainer: { paddingHorizontal: 10, marginVertical: 4 },
  userContainer: { alignItems: "flex-end" },
  adminContainer: { alignItems: "flex-start" },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    maxWidth: "80%",
  },
  userBubble: {
    backgroundColor: PRIMARY_COLOR,
    borderTopRightRadius: 0,
  },
  adminBubble: {
    backgroundColor: "#F0F0F0",
    borderTopLeftRadius: 0,
  },
  sender: { fontSize: 11, marginBottom: 2, fontWeight: "bold" },
  messageText: { fontSize: 15, lineHeight: 20 },
  timestamp: { fontSize: 10, marginTop: 5, alignSelf: "flex-end" },
  typingContainer: { paddingHorizontal: 10, paddingVertical: 5 },
  typingText: { fontSize: 13, fontStyle: "italic", color: "#666" },
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
