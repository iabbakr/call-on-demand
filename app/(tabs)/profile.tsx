// ============= profile.tsx =============
import { Feather, FontAwesome5, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Button, Card, Chip } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";

interface UserData {
  fullName: string;
  username: string;
  phoneNumber: string;
  location: string;
  profilePic?: string;
  bankName?: string;
  accountNumber?: string;
  email?: string;
}

export default function Profile() {
  const { user, logOut } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Failed to load user data.");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "You need to allow access to your gallery.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        await uploadProfileImage(imageUri);
      }
    } catch (error) {
      console.error("Image Picker Error:", error);
      Alert.alert("Error", "Unable to pick image.");
    }
  };

  const uploadProfileImage = async (uri: string) => {
    if (!user) return;
    setUploading(true);
    try {
      const secureUrl = await uploadImageToCloudinary(uri, "profilePictures");
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { profilePic: secureUrl });
      setUserData((prev) => (prev ? { ...prev, profilePic: secureUrl } : prev));
      Alert.alert("✅ Success", "Profile picture updated!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("❌ Error", "Failed to upload profile picture.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const menuItems = [
    {
      icon: "user",
      iconType: "feather",
      title: "Account Information",
      subtitle: "View and edit your details",
      route: "/profile/account-info",
      color: PRIMARY_COLOR,
      bg: ACCENT_COLOR,
    },
    {
      icon: "history",
      iconType: "material-community",
      title: "Transaction History",
      subtitle: "View all transactions",
      route: "/profile/transaction-history",
      color: "#2196F3",
      bg: "#E3F2FD",
    },
    {
      icon: "security",
      iconType: "material-community",
      title: "Security",
      subtitle: "Manage security settings",
      route: "/profile/security/security",
      color: SUCCESS_COLOR,
      bg: "#E8F5E9",
    },
    {
      icon: "notifications",
      iconType: "material",
      title: "Notifications",
      subtitle: "Configure notifications",
      route: "/profile/notifications",
      color: "#FF9800",
      bg: "#FFF3E0",
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Profile Card */}
      <Card style={styles.profileCard}>
        <Card.Content>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Pressable onPress={pickImage} style={styles.avatarContainer}>
              {uploading ? (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                </View>
              ) : (
                <>
                  <Image
                    source={{
                      uri:
                        userData?.profilePic ||
                        "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                    }}
                    style={styles.avatar}
                  />
                  <View style={styles.cameraButton}>
                    <FontAwesome5 name="camera" size={14} color="#fff" />
                  </View>
                </>
              )}
            </Pressable>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userData?.fullName || "User"}</Text>
              <Text style={styles.userHandle}>@{userData?.username || "username"}</Text>
              <Chip
                icon="email"
                compact
                style={styles.emailChip}
                textStyle={styles.emailChipText}
              >
                {userData?.email || user?.email || "No email"}
              </Chip>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <FontAwesome5 name="phone" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.statValue}>{userData?.phoneNumber || "N/A"}</Text>
              <Text style={styles.statLabel}>Phone</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <FontAwesome5 name="map-marker-alt" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.statValue}>{userData?.location || "N/A"}</Text>
              <Text style={styles.statLabel}>Location</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        {menuItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => router.push(item.route as any)}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
              {item.iconType === "feather" && (
                <Feather name={item.icon as any} size={22} color={item.color} />
              )}
              {item.iconType === "material-community" && (
                <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
              )}
              {item.iconType === "material" && (
                <MaterialIcons name={item.icon as any} size={22} color={item.color} />
              )}
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={INACTIVE_COLOR} />
          </Pressable>
        ))}
      </View>

      {/* Logout Button */}
      <Button
        mode="contained"
        icon="logout"
        onPress={logOut}
        style={styles.logoutButton}
        contentStyle={styles.logoutButtonContent}
        buttonColor="#F44336"
      >
        Logout
      </Button>

      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    elevation: 4,
    borderRadius: 20,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: PRIMARY_COLOR,
  },
  uploadingOverlay: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraButton: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  userInfo: {
    alignItems: "center",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 16,
    color: INACTIVE_COLOR,
    marginBottom: 12,
  },
  emailChip: {
    backgroundColor: ACCENT_COLOR,
  },
  emailChipText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: INACTIVE_COLOR,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
  },
  menuSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: INACTIVE_COLOR,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
  versionText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 12,
    color: INACTIVE_COLOR,
  },
});