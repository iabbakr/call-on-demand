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
import { Alert, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";

interface UserData {
  fullName: string;
  username: string;
  profilePic?: string;
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
    userData?.profilePic ||
    "https://res-console.cloudinary.com/dswwtuano/thumbnails/v1/image/upload/v1760121319/dGkzNHBybzJobGQ3Z2txNWFrZDg=/preview";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

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
              <View style={styles.onlineIndicator} />
            </Pressable>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>
                {getGreeting()}
              </Text>
              <Text style={styles.userName} numberOfLines={1}>
                {userData?.fullName?.split(" ")[0] || "User"} 👋
              </Text>
            </View>
          </View>
        ),
        headerTitleAlign: "left",
        headerStyle: {
          backgroundColor: BACKGROUND_COLOR,
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: Platform.OS === "ios" ? 110 : 80,
        },
        tabBarActiveTintColor: PRIMARY_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: BACKGROUND_COLOR,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          height: Platform.OS === "ios" ? 88 : 70,
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
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
                <MaterialIcons name="support-agent" size={22} color={PRIMARY_COLOR} />
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
                  color={PRIMARY_COLOR}
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
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Entypo
                name="home"
                size={24}
                color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reward"
        options={{
          headerShown: false,
          tabBarLabel: "Rewards",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <MaterialCommunityIcons
                name="diamond-stone"
                size={24}
                color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          headerShown: false,
          tabBarLabel: "Finance",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <FontAwesome5
                name="donate"
                size={24}
                color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Entypo
                name="user"
                size={24}
                color={focused ? PRIMARY_COLOR : INACTIVE_COLOR}
              />
            </View>
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
    gap: 8,
    marginLeft: 16,
    flexShrink: 1,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    position: "relative",
    elevation: 3,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileButtonPressed: { 
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  profileImage: { 
    width: "100%", 
    height: "100%",
    backgroundColor: ACCENT_COLOR,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: BACKGROUND_COLOR,
  },
greetingContainer: {
  justifyContent: "center",
  marginLeft: 8,
  flexShrink: 1, // allow text to shrink instead of wrapping
},
greetingText: {
  fontSize: 12,
  color: INACTIVE_COLOR,
  fontWeight: "500",
},
userName: {
  fontSize: 16,
  fontWeight: "bold",
  color: "#333",
  marginTop: 0,
  flexShrink: 1, // ensures it stays on one line
},
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT_COLOR,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconButtonPressed: { 
    backgroundColor: PRIMARY_COLOR + "30",
    transform: [{ scale: 0.95 }],
  },
  notificationWrapper: { 
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
    borderWidth: 2,
    borderColor: BACKGROUND_COLOR,
  },
  tabIconContainer: {
    width: 56,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  tabIconContainerActive: {
    backgroundColor: ACCENT_COLOR,
  },
});