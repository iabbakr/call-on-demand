// notifications/index.tsx - Improved with Better Styling
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
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
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { ActivityIndicator, Card, Chip } from "react-native-paper";
import { useApp } from "../../context/AppContext";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const SCREEN_BG = "#F5F5F5";

const { width } = Dimensions.get("window");

export default function Notifications() {
  const router = useRouter();
  const { userProfile } = useApp();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recipientType, setRecipientType] = useState<"all" | "specific">("all");
  const [username, setUsername] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isAdmin =
    userProfile?.role === "admin" || userProfile?.email === "admin@example.com";

  // Listen for user's notifications
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

  // Mark unread as read
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

  // Pick image from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setUploadingImage(true);
      try {
        const uploadedUrl = await uploadImageToCloudinary(result.assets[0].uri);
        setImage(uploadedUrl);
      } catch (error) {
        Alert.alert("Error", "Failed to upload image");
      } finally {
        setUploadingImage(false);
      }
    }
  };

  // Find user by username
  const findUserByUsername = async (username: string) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username.trim().replace(/^@/, "")));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;
    return snapshot.docs[0];
  };

  // Admin send notification
  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert("Missing Fields", "Please enter both title and message");
      return;
    }

    if (recipientType === "specific" && !username.trim()) {
      Alert.alert("Missing Username", "Please enter a username");
      return;
    }

    setSending(true);
    try {
      let recipientsCount = 0;

      if (recipientType === "specific") {
        // Send to specific user
        const userDoc = await findUserByUsername(username);

        if (!userDoc) {
          Alert.alert("User Not Found", `No user found with username: ${username}`);
          setSending(false);
          return;
        }

        await addDoc(collection(db, "notifications"), {
          title,
          message,
          userId: userDoc.id,
          recipientType: "specific",
          imageUrl: image || null,
          isRead: false,
          createdAt: new Date(),
        });

        recipientsCount = 1;
      } else {
        // Send to all users
        const usersSnap = await getDocs(collection(db, "users"));

        const batch = usersSnap.docs.map((userDoc) =>
          addDoc(collection(db, "notifications"), {
            title,
            message,
            userId: userDoc.id,
            recipientType: "all",
            imageUrl: image || null,
            isRead: false,
            createdAt: new Date(),
          })
        );

        await Promise.all(batch);
        recipientsCount = usersSnap.size;
      }

      Alert.alert(
        "✅ Notification Sent",
        `Successfully sent to ${recipientsCount} ${recipientsCount === 1 ? "user" : "users"}!`
      );

      // Reset form
      setTitle("");
      setMessage("");
      setUsername("");
      setImage(null);
      setRecipientType("all");
    } catch (error) {
      console.error("Error sending notification:", error);
      Alert.alert("Error", "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const getNotificationIcon = (item: any) => {
    if (item.imageUrl) return "image";
    if (item.recipientType === "specific") return "user";
    return "bullhorn";
  };

  const renderNotification = ({ item }: { item: any }) => (
    <Card style={[styles.notificationCard, !item.isRead && styles.unreadCard]}>
      <Card.Content>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIconContainer}>
            <FontAwesome5
              name={getNotificationIcon(item)}
              size={20}
              color={PRIMARY_COLOR}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationTimestamp}>
              {item.createdAt?.toDate
                ? new Date(item.createdAt.toDate()).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.notificationMessage}>{item.message}</Text>

        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.notificationImage} />
        )}

        {item.recipientType === "specific" && (
          <Chip compact style={styles.specificChip} textStyle={styles.specificChipText}>
            Personal Message
          </Chip>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating color={PRIMARY_COLOR} size="large" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Notifications",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Admin Panel */}
          {isAdmin && (
            <Card style={styles.adminCard}>
              <Card.Content>
                <View style={styles.adminHeader}>
                  <FontAwesome5 name="user-shield" size={20} color={PRIMARY_COLOR} />
                  <Text style={styles.adminTitle}>Send Notification</Text>
                </View>

                {/* Recipient Type Selection */}
                <Text style={styles.inputLabel}>Send To</Text>
                <View style={styles.recipientTypeContainer}>
                  <Pressable
                    style={[
                      styles.recipientTypeButton,
                      recipientType === "all" && styles.recipientTypeButtonActive,
                    ]}
                    onPress={() => setRecipientType("all")}
                  >
                    <FontAwesome5
                      name="users"
                      size={16}
                      color={recipientType === "all" ? "#FFF" : PRIMARY_COLOR}
                    />
                    <Text
                      style={[
                        styles.recipientTypeText,
                        recipientType === "all" && styles.recipientTypeTextActive,
                      ]}
                    >
                      Everyone
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.recipientTypeButton,
                      recipientType === "specific" && styles.recipientTypeButtonActive,
                    ]}
                    onPress={() => setRecipientType("specific")}
                  >
                    <FontAwesome5
                      name="user"
                      size={16}
                      color={recipientType === "specific" ? "#FFF" : PRIMARY_COLOR}
                    />
                    <Text
                      style={[
                        styles.recipientTypeText,
                        recipientType === "specific" && styles.recipientTypeTextActive,
                      ]}
                    >
                      Specific User
                    </Text>
                  </Pressable>
                </View>

                {/* Username Input (if specific) */}
                {recipientType === "specific" && (
                  <View>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. @username or username"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* Title Input */}
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Notification title"
                  value={title}
                  onChangeText={setTitle}
                />

                {/* Message Input */}
                <Text style={styles.inputLabel}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Write your message here..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Image Upload */}
                <Pressable
                  style={styles.uploadButton}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                  ) : (
                    <>
                      <FontAwesome5
                        name={image ? "image" : "cloud-upload-alt"}
                        size={20}
                        color={PRIMARY_COLOR}
                      />
                      <Text style={styles.uploadText}>
                        {image ? "Change Image" : "Attach Image (Optional)"}
                      </Text>
                    </>
                  )}
                </Pressable>

                {image && (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: image }} style={styles.previewImage} />
                    <Pressable
                      style={styles.removeImageBtn}
                      onPress={() => setImage(null)}
                    >
                      <FontAwesome5 name="times-circle" size={24} color={ERROR_COLOR} />
                    </Pressable>
                  </View>
                )}

                {/* Send Button */}
                <Pressable
                  style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                  onPress={handleSendNotification}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color={BACKGROUND_COLOR} />
                  ) : (
                    <View style={styles.sendButtonContent}>
                      <FontAwesome5 name="paper-plane" size={16} color={BACKGROUND_COLOR} />
                      <Text style={styles.sendButtonText}>Send Notification</Text>
                    </View>
                  )}
                </Pressable>
              </Card.Content>
            </Card>
          )}

          {/* Notifications Header */}
          <View style={styles.notificationsHeader}>
            <Text style={styles.notificationsTitle}>
              {isAdmin ? "All Notifications" : "Your Notifications"}
            </Text>
            {notifications.length > 0 && (
              <Chip compact style={styles.countChip}>
                {notifications.length}
              </Chip>
            )}
          </View>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="bell-slash" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>
                You'll see notifications here when you receive them
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderNotification}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
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
    color: "#666",
    fontSize: 14,
  },

  // Admin Card
  adminCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: ACCENT_COLOR,
    elevation: 2,
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },

  // Recipient Type
  recipientTypeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  recipientTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BACKGROUND_COLOR,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
  },
  recipientTypeButtonActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  recipientTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_COLOR,
  },
  recipientTypeTextActive: {
    color: "#FFF",
  },

  // Inputs
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: BACKGROUND_COLOR,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#333",
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },

  // Upload Button
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BACKGROUND_COLOR,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_COLOR,
  },

  // Image Preview
  imagePreview: {
    position: "relative",
    marginBottom: 16,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
  },

  // Send Button
  sendButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sendButtonText: {
    color: BACKGROUND_COLOR,
    fontWeight: "700",
    fontSize: 15,
  },

  // Notifications Header
  notificationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  notificationsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  countChip: {
    backgroundColor: PRIMARY_COLOR,
    height: 28,
  },

  // Notification Card
  notificationCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: ACCENT_COLOR,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR + "40",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: "#999",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ERROR_COLOR,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
  },
  specificChip: {
    backgroundColor: SECONDARY_COLOR + "20",
    alignSelf: "flex-start",
  },
  specificChipText: {
    fontSize: 11,
    color: SECONDARY_COLOR,
    fontWeight: "600",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },

  // List
  listContent: {
    paddingBottom: 16,
  },
});