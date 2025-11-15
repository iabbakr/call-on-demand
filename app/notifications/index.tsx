import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text

} from "react-native";
import { ActivityIndicator, } from "react-native-paper";
import { useApp } from "../../context/AppContext";
import { uploadImageToCloudinary } from "../../lib/cloudinary"; // ✅ helper for Cloudinary uploads
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

export default function Notifications() {
  const { userProfile } = useApp();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [category, setCategory] = useState("all");
  const [image, setImage] = useState<string | null>(null);

  const isAdmin =
    userProfile?.role === "admin" || userProfile?.email === "admin@example.com";

  // ✅ Listen for user's notifications
  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userProfile.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotifications(items);
      setLoading(false);
    });

    return () => unsub();
  }, [userProfile]);

  // ✅ Mark unread as read
  useEffect(() => {
    const markAsRead = async () => {
      if (!userProfile?.uid || notifications.length === 0) return;

      const unread = notifications.filter((n) => n.isRead === false);
      for (const n of unread) {
        await updateDoc(doc(db, "notifications", n.id), { isRead: true });
      }
    };
    markAsRead();
  }, [notifications, userProfile]);

  // ✅ Pick image from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uploadedUrl = await uploadImageToCloudinary(result.assets[0].uri);
      setImage(uploadedUrl);
    }
  };

  // ✅ Admin broadcast
  const handleBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert("Error", "Please enter both title and message");
      return;
    }

    setSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const usersToNotify = usersSnap.docs.filter((doc) => {
        const data = doc.data();
        if (category === "all") return true;
        return data.role === category;
      });

      const batch = usersToNotify.map((userDoc) =>
        addDoc(collection(db, "notifications"), {
          title,
          message,
          userId: userDoc.id,
          category,
          imageUrl: image || null,
          isRead: false,
          createdAt: new Date(),
        })
      );

      await Promise.all(batch);
      Alert.alert("✅ Success", `Broadcast sent to ${category} group!`);
      setTitle("");
      setMessage("");
      setImage(null);
    } catch (error) {
      console.error("Error broadcasting notification:", error);
      Alert.alert("Error", "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator animating color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>

      {/* ✅ ADMIN PANEL */}
      {isAdmin && (
        <View style={styles.adminPanel}>
          <Text style={styles.adminTitle}>Admin Broadcast</Text>

          <TextInput
            style={styles.input}
            placeholder="Notification Title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Notification Message"
            value={message}
            onChangeText={setMessage}
            multiline
          />

          {/* Category Selection */}
          <View style={styles.categoryContainer}>
            {["all", "buyer", "seller"].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categorySelected,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextSelected,
                  ]}
                >
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Image Upload */}
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadText}>
              {image ? "Change Image" : "Attach Image (optional)"}
            </Text>
          </TouchableOpacity>

          {image && (
            <Image
              source={{ uri: image }}
              style={{ width: "100%", height: 150, borderRadius: 8, marginTop: 10 }}
            />
          )}

          <TouchableOpacity
            style={[styles.button, sending && { opacity: 0.6 }]}
            onPress={handleBroadcast}
            disabled={sending}
          >
            <Text style={styles.buttonText}>
              {sending ? "Sending..." : "Send Notification"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ USER NOTIFICATIONS */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.notificationCard,
              !item.isRead && styles.unreadNotification,
            ]}
          >
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationBody}>{item.message}</Text>
            {item.imageUrl && (
              <Image
                source={{ uri: item.imageUrl }}
                style={{
                  width: "100%",
                  height: 120,
                  marginTop: 8,
                  borderRadius: 8,
                }}
              />
            )}
            <Text style={styles.timestamp}>
              {item.createdAt?.toDate
                ? new Date(item.createdAt.toDate()).toLocaleString()
                : new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No notifications yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 20,
  },
  adminPanel: {
    backgroundColor: "#F0F4FF",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#FFF",
    marginBottom: 10,
  },
  categoryContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categorySelected: {
    backgroundColor: PRIMARY_COLOR,
  },
  categoryText: {
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  categoryTextSelected: {
    color: "#FFF",
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  uploadText: {
    color: "#333",
  },
  button: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  notificationCard: {
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  unreadNotification: {
    backgroundColor: "#E8F0FE",
  },
  notificationTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  notificationBody: {
    color: "#444",
  },
  timestamp: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
