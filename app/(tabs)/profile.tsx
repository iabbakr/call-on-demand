import { Feather, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

interface UserData {
  fullName: string;
  username: string;
  phoneNumber: string;
  location: string;
  profilePic?: string;
  bankName?: string;
  accountNumber?: string;
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
    }
  };

  const uploadProfileImage = async (uri: string) => {
    if (!user) return;
    setUploading(true);
    try {
      const storage = getStorage();
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `profilePictures/${user.uid}.jpg`);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { profilePic: downloadURL });

      setUserData((prev) => (prev ? { ...prev, profilePic: downloadURL } : prev));
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload profile picture.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Profile</Text>

      <View style={styles.content}>
        {/* --- User Info --- */}
        <View style={styles.userTopInfo}>
          <Pressable onPress={pickImage}>
            <View style={styles.userTopInfoImage}>
              {uploading ? (
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              ) : (
                <Image
                  source={{
                    uri:
                      userData?.profilePic ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                  }}
                  style={styles.profilePic}
                />
              )}
            </View>
          </Pressable>

          <View style={styles.userTopInfoUser}>
            <Text style={styles.userTopInfoTitle}>
              {userData?.fullName || "User"}
            </Text>
            <Text style={styles.userTopInfoUserName}>
              @{userData?.username || "username"}
            </Text>
          </View>
        </View>

        {/* --- Profile Options --- */}
        <View style={styles.profileOptions}>
          {[
            {
              icon: <Feather name="user" size={22} color={PRIMARY_COLOR} />,
              title: "Account Information",
              route: "/profile/account-info",
            },
            {
              icon: <MaterialCommunityIcons name="history" size={22} color={PRIMARY_COLOR} />,
              title: "Transaction History",
              route: "/profile/transaction-history",
            },
            {
              icon: <MaterialCommunityIcons name="security" size={22} color={PRIMARY_COLOR} />,
              title: "Security",
              route: "/profile/security/security",
            },
            {
              icon: <MaterialIcons name="notifications" size={22} color={PRIMARY_COLOR} />,
              title: "Notifications",
              route: "/profile/notifications",
            },
          ].map((item, index) => (
            <Pressable
              key={index}
              onPress={() => router.push(item.route as any)}
              android_ripple={{ color: HEADER_BG }}
              style={({ pressed }) => [
                styles.options,
                pressed && { backgroundColor: HEADER_BG },
              ]}
            >
              <View style={styles.optionTitleView}>
                {item.icon}
                <Text style={styles.optionTitle}>{item.title}</Text>
              </View>
              <MaterialIcons name="navigate-next" size={24} color={INACTIVE_COLOR} />
            </Pressable>
          ))}
        </View>

        {/* --- Logout --- */}
        <Button
          mode="outlined"
          textColor={PRIMARY_COLOR}
          style={styles.logout}
          onPress={logOut}
        >
          Logout
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HEADER_BG,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    textAlign: "center",
    marginBottom: 20,
  },
  content: {
    width: "100%",
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  userTopInfo: {
    alignItems: "center",
    gap: 12,
    marginBottom: 25,
  },
  userTopInfoImage: {
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    height: 90,
    width: 90,
    borderRadius: 50,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePic: {
    width: "100%",
    height: "100%",
  },
  userTopInfoUser: {
    alignItems: "center",
  },
  userTopInfoTitle: {
    fontWeight: "bold",
    fontSize: 17,
    color: PRIMARY_COLOR,
  },
  userTopInfoUserName: {
    color: INACTIVE_COLOR,
    fontSize: 14,
  },
  profileOptions: {
    marginTop: 10,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 10,
    overflow: "hidden",
  },
  options: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: HEADER_BG,
  },
  optionTitleView: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  logout: {
    borderColor: PRIMARY_COLOR,
    marginTop: 40,
    alignSelf: "center",
    width: "60%",
    borderRadius: 8,
    borderWidth: 1.5,
  },
});
