import {
  Entypo,
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";

interface UserData {
  fullName: string;
  username: string;
}

export default function RootLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(false);

  // 🔹 Fetch user info
  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setUserData(snap.data() as UserData);
        } else {
          console.log("No user data found");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        Alert.alert("Error", "Failed to fetch user info.");
      }
    };
    fetchUserData();
  }, [user]);

  // 🔹 Listen for new chat messages
  useEffect(() => {
    if (!user) return;

    const chatRef = doc(db, "chats", user.uid);
    const unsub = onSnapshot(chatRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const unreadCount = data?.metadata?.unreadCount || 0;
      setHasNewMessage(unreadCount > 0);
    });

    return () => unsub();
  }, [user]);

  // 🔹 Listen for unread notifications
  useEffect(() => {
    if (!user) return;

    const notifRef = collection(db, "notifications", user.uid, "list");
    const q = query(notifRef, where("read", "==", false));

    const unsub = onSnapshot(q, (snapshot) => {
      setHasUnreadNotification(!snapshot.empty);
    });

    return () => unsub();
  }, [user]);

  const userProfileImage =
    "https://res-console.cloudinary.com/dswwtuano/thumbnails/v1/image/upload/v1760121319/dGkzNHBybzJobGQ3Z2txNWFrZDg=/preview";

  return (
    <Tabs
      screenOptions={{
        headerTitle: () => (
          <View style={styles.headerLeft}>
            <Pressable
              style={({ pressed }) => [
                styles.profileButton,
                pressed && styles.profileButtonPressed,
              ]}
              onPress={() => router.push("/profile")}
            >
              <Image
                source={{ uri: userProfileImage }}
                style={styles.profileImage}
              />
            </Pressable>
            <View style={styles.greetingContainer}>
              <Text
                style={{
                  fontWeight: "bold",
                  fontSize: 15,
                  color: INACTIVE_COLOR,
                }}
              >
                Hello, {userData?.fullName?.split(" ")[0] || "User"}
              </Text>
            </View>
          </View>
        ),
        headerTitleAlign: "left",
        headerStyle: {
          backgroundColor: BACKGROUND_COLOR,
          borderBottomWidth: 1,
          borderBottomColor: "#E0E0E0",
          height: 120,
        },
        tabBarActiveTintColor: PRIMARY_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: BACKGROUND_COLOR,
          borderTopWidth: 1,
          borderTopColor: "#E0E0E0",
          height: 95,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
        headerRight: () => (
          <View style={styles.headerRight}>
            {/* Support */}
            <Pressable
              onPress={() => router.push("/support")}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <View style={styles.notificationWrapper}>
                <MaterialIcons name="support-agent" size={22} color="#1A1A1A" />
                {hasNewMessage && <View style={styles.badge} />}
              </View>
            </Pressable>

            {/* Notifications */}
            <Pressable
              onPress={() => router.push("/notifications")}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <View style={styles.notificationWrapper}>
                <MaterialIcons
                  name="notifications"
                  size={22}
                  color="#1A1A1A"
                />
                {hasUnreadNotification && <View style={styles.badge} />}
              </View>
            </Pressable>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: true,
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <Entypo
              name="home"
              size={24}
              color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reward"
        options={{
          headerShown: false,
          tabBarLabel: "Rewards",
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name="diamond-stone"
              size={24}
              color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          headerShown: false,
          tabBarLabel: "Finance",
          tabBarIcon: ({ focused }) => (
            <FontAwesome5
              name="donate"
              size={24}
              color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => (
            <Entypo
              name="user"
              size={24}
              color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 8,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: INACTIVE_COLOR,
  },
  profileButtonPressed: { opacity: 0.7 },
  profileImage: { width: "100%", height: "100%" },
  greetingContainer: { justifyContent: "center" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 12,
    paddingVertical: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  iconButtonPressed: { backgroundColor: "#E0E0E0" },
  notificationWrapper: { position: "relative" },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
    borderWidth: 1.5,
    borderColor: "#F5F5F5",
  },
});
