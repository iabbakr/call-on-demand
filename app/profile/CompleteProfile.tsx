// ============= CompleteProfile.tsx (Improved) =============
import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, Chip, Text, TextInput } from "react-native-paper";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { db } from "../../lib/firebase";
import { addBonusToUser } from "../../lib/rewards";

const PRIMARY_COLOR = "#6200EE";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const WARNING_COLOR = "#FF9800";
const ERROR_COLOR = "#F44336";
const BACKGROUND_COLOR = "#FFFFFF";

type ProfileData = {
  address: string;
  nin: string;
  bvn: string;
  dob: string;
  selfie: string;
  role?: string;
  profileStatus?: "incomplete" | "pending" | "approved" | "rejected";
};

const STATUS_CONFIG = {
  incomplete: { color: WARNING_COLOR, icon: "clock", label: "Incomplete" },
  pending: { color: "#2196F3", icon: "hourglass-half", label: "Pending Review" },
  approved: { color: SUCCESS_COLOR, icon: "check-circle", label: "Approved" },
  rejected: { color: ERROR_COLOR, icon: "times-circle", label: "Rejected" },
};

export default function CompleteProfileWithAdmin() {
  const { user } = useAuth();
  const { userProfile } = useApp();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    address: "",
    nin: "",
    bvn: "",
    dob: "",
    selfie: "",
    role: "",
    profileStatus: "incomplete",
  });
  const [status, setStatus] = useState<"incomplete" | "pending" | "approved" | "rejected">(
    "incomplete"
  );
  const [pendingUsers, setPendingUsers] = useState<{ id: string; data: ProfileData & { fullName?: string } }[]>([]);

  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ProfileData;
        setProfileData({
          address: data.address || "",
          nin: data.nin || "",
          bvn: data.bvn || "",
          dob: data.dob || "",
          selfie: data.selfie || "",
          role: data.role || "",
          profileStatus: data.profileStatus || "incomplete",
        });
        setStatus(data.profileStatus || "incomplete");
      }
      setLoading(false);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchPending = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "users"));
      const pending: { id: string; data: ProfileData & { fullName?: string } }[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as ProfileData & { fullName?: string };
        if (data.profileStatus === "pending") pending.push({ id: docSnap.id, data });
      });
      setPendingUsers(pending);
      setLoading(false);
    };
    fetchPending();
  }, [isAdmin]);

  const handleTakePhoto = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== "granted") {
      return Alert.alert("Permission Required", "Camera access is needed to take a selfie.");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const uri = result.assets[0].uri;
        const url = await uploadImageToCloudinary(uri, "user_selfies");
        setProfileData((prev) => ({ ...prev, selfie: url }));
        Alert.alert("✅ Success", "Your selfie was uploaded successfully!");
      } catch (err) {
        console.error("Upload error:", err);
        Alert.alert("❌ Error", "Failed to upload photo.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user) return Alert.alert("Error", "User not found. Please log in again.");
    const { address, nin, bvn, dob, selfie } = profileData;
    if (!address || !nin || !bvn || !dob || !selfie) {
      return Alert.alert("Incomplete", "Please fill in all fields and take a selfie.");
    }
    try {
      setUploading(true);
      await updateDoc(doc(db, "users", user.uid), {
        ...profileData,
        profileStatus: "pending",
      });
      Alert.alert("✅ Submitted", "Your verification is pending approval.");
      setStatus("pending");
    } catch (err) {
      console.error("Submit error:", err);
      Alert.alert("❌ Error", "Failed to submit verification.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (user && status === "approved") addBonusToUser(100);
  }, [status, user]);

  const handleAdminAction = async (uid: string, action: "approve" | "reject") => {
    try {
      await updateDoc(doc(db, "users", uid), {
        profileStatus: action === "approve" ? "approved" : "rejected",
      });
      Alert.alert("✅ Success", `User profile has been ${action === "approve" ? "approved" : "rejected"}`);
      setPendingUsers((prev) => prev.filter((u) => u.id !== uid));
    } catch (err) {
      console.error(err);
      Alert.alert("❌ Error", "Failed to update user status.");
    }
  };

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome5 name="user-lock" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Authentication Required</Text>
        <Text style={styles.emptyText}>Please log in to complete your profile.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Admin view
  if (isAdmin) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <FontAwesome5 name="user-shield" size={32} color={PRIMARY_COLOR} />
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Review pending verifications</Text>
        </View>

        {pendingUsers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyCardContent}>
              <FontAwesome5 name="check-circle" size={48} color={SUCCESS_COLOR} />
              <Text style={styles.emptyCardTitle}>All Clear!</Text>
              <Text style={styles.emptyCardText}>No pending verifications at the moment.</Text>
            </Card.Content>
          </Card>
        ) : (
          pendingUsers.map(({ id, data }) => (
            <Card key={id} style={styles.adminCard}>
              <Card.Content>
                <View style={styles.adminCardHeader}>
                  <Text style={styles.adminCardTitle}>{data.fullName || "User"}</Text>
                  <Chip
                    icon="clock"
                    style={styles.pendingChip}
                    textStyle={styles.pendingChipText}
                  >
                    Pending
                  </Chip>
                </View>

                <View style={styles.adminInfoSection}>
                  <View style={styles.adminInfoRow}>
                    <FontAwesome5 name="home" size={14} color="#666" />
                    <Text style={styles.adminInfoLabel}>Address:</Text>
                    <Text style={styles.adminInfoValue}>{data.address}</Text>
                  </View>
                  <View style={styles.adminInfoRow}>
                    <FontAwesome5 name="id-card" size={14} color="#666" />
                    <Text style={styles.adminInfoLabel}>NIN:</Text>
                    <Text style={styles.adminInfoValue}>•••{data.nin?.slice(-4)}</Text>
                  </View>
                  <View style={styles.adminInfoRow}>
                    <FontAwesome5 name="id-badge" size={14} color="#666" />
                    <Text style={styles.adminInfoLabel}>BVN:</Text>
                    <Text style={styles.adminInfoValue}>•••{data.bvn?.slice(-4)}</Text>
                  </View>
                  <View style={styles.adminInfoRow}>
                    <FontAwesome5 name="calendar" size={14} color="#666" />
                    <Text style={styles.adminInfoLabel}>DOB:</Text>
                    <Text style={styles.adminInfoValue}>{data.dob}</Text>
                  </View>
                </View>

                {data.selfie && (
                  <View style={styles.selfieContainer}>
                    <Text style={styles.selfieLabel}>Verification Selfie:</Text>
                    <Image source={{ uri: data.selfie }} style={styles.adminSelfie} />
                  </View>
                )}

                <View style={styles.adminActions}>
                  <Button
                    mode="contained"
                    onPress={() => handleAdminAction(id, "approve")}
                    style={styles.approveButton}
                    icon="check"
                  >
                    Approve
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleAdminAction(id, "reject")}
                    style={styles.rejectButton}
                    textColor={ERROR_COLOR}
                    icon="close"
                  >
                    Reject
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    );
  }

  // User view
  const statusConfig = STATUS_CONFIG[status];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F5F5F5" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={styles.header}>
          <FontAwesome5 name="user-check" size={32} color={PRIMARY_COLOR} />
          <Text style={styles.headerTitle}>Profile Verification</Text>
          <Text style={styles.headerSubtitle}>Complete your KYC to earn 100 coins</Text>
        </View>

        {/* Status Banner */}
        <Card style={[styles.statusCard, { backgroundColor: statusConfig.color + "20" }]}>
          <Card.Content style={styles.statusContent}>
            <FontAwesome5 name={statusConfig.icon} size={24} color={statusConfig.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              {status === "pending" && (
                <Text style={styles.statusHint}>
                  Your profile is under review. This usually takes 24-48 hours.
                </Text>
              )}
              {status === "approved" && (
                <Text style={styles.statusHint}>
                  🎉 You've earned 100 bonus coins!
                </Text>
              )}
              {status === "rejected" && (
                <Text style={styles.statusHint}>
                  Please review and resubmit your information.
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Form */}
        <Card style={styles.formCard}>
          <Card.Content>
            <TextInput
              label="Residential Address"
              mode="outlined"
              value={profileData.address}
              onChangeText={(t) => setProfileData((p) => ({ ...p, address: t }))}
              style={styles.input}
              left={<TextInput.Icon icon="home" />}
              multiline
              disabled={status === "pending" || status === "approved"}
            />
            <TextInput
              label="NIN (National ID Number)"
              mode="outlined"
              keyboardType="numeric"
              value={profileData.nin}
              onChangeText={(t) => setProfileData((p) => ({ ...p, nin: t }))}
              style={styles.input}
              left={<TextInput.Icon icon="card-account-details" />}
              maxLength={11}
              disabled={status === "pending" || status === "approved"}
            />
            <TextInput
              label="BVN (Bank Verification Number)"
              mode="outlined"
              keyboardType="numeric"
              value={profileData.bvn}
              onChangeText={(t) => setProfileData((p) => ({ ...p, bvn: t }))}
              style={styles.input}
              left={<TextInput.Icon icon="bank" />}
              maxLength={11}
              disabled={status === "pending" || status === "approved"}
            />
            <TextInput
              label="Date of Birth"
              placeholder="YYYY-MM-DD"
              mode="outlined"
              value={profileData.dob}
              onChangeText={(t) => setProfileData((p) => ({ ...p, dob: t }))}
              style={styles.input}
              left={<TextInput.Icon icon="calendar" />}
              disabled={status === "pending" || status === "approved"}
            />

            {/* Selfie Upload */}
            <Text style={styles.selfieTitle}>Verification Selfie</Text>
            <TouchableOpacity
              style={styles.selfieUploadBox}
              onPress={handleTakePhoto}
              disabled={uploading || status === "pending" || status === "approved"}
            >
              {uploading ? (
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              ) : profileData.selfie ? (
                <Image source={{ uri: profileData.selfie }} style={styles.selfieImage} />
              ) : (
                <View style={styles.selfieEmpty}>
                  <FontAwesome5 name="camera" size={40} color={PRIMARY_COLOR} />
                  <Text style={styles.selfieEmptyText}>Take a Selfie</Text>
                  <Text style={styles.selfieHint}>
                    Take a clear photo of your face
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Submit Button */}
            {status === "pending" && (
              <Button
                mode="contained"
                style={[styles.submitButton, { backgroundColor: "#2196F3" }]}
                disabled
                icon="clock"
              >
                Awaiting Approval
              </Button>
            )}
            {status === "approved" && (
              <Button
                mode="contained"
                style={[styles.submitButton, { backgroundColor: SUCCESS_COLOR }]}
                disabled
                icon="check-circle"
              >
                ✅ Verified — 100 Coins Earned!
              </Button>
            )}
            {(status === "rejected" || status === "incomplete") && (
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={uploading}
                disabled={uploading}
                style={styles.submitButton}
                icon="send"
              >
                {status === "rejected" ? "Resubmit for Approval" : "Submit for Verification"}
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <FontAwesome5 name="shield-alt" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.infoTitle}>Why verify your profile?</Text>
            </View>
            <View style={styles.infoItem}>
              <FontAwesome5 name="check" size={14} color={SUCCESS_COLOR} />
              <Text style={styles.infoText}>Earn 100 bonus coins</Text>
            </View>
            <View style={styles.infoItem}>
              <FontAwesome5 name="check" size={14} color={SUCCESS_COLOR} />
              <Text style={styles.infoText}>Unlock premium features</Text>
            </View>
            <View style={styles.infoItem}>
              <FontAwesome5 name="check" size={14} color={SUCCESS_COLOR} />
              <Text style={styles.infoText}>Secure your account</Text>
            </View>
            <View style={styles.infoItem}>
              <FontAwesome5 name="check" size={14} color={SUCCESS_COLOR} />
              <Text style={styles.infoText}>Build trust with the community</Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#F5F5F5",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  statusCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statusHint: {
    fontSize: 13,
    color: "#666",
  },
  formCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: BACKGROUND_COLOR,
  },
  selfieTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginTop: 8,
  },
  selfieUploadBox: {
    height: 280,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  selfieImage: {
    width: "100%",
    height: "100%",
  },
  selfieEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  selfieEmptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    marginTop: 12,
    marginBottom: 4,
  },
  selfieHint: {
    fontSize: 13,
    color: "#666",
  },
  submitButton: {
    paddingVertical: 8,
    borderRadius: 8,
  },
  infoCard: {
    backgroundColor: ACCENT_COLOR,
    elevation: 0,
    borderRadius: 12,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
  },
  // Admin styles
  adminCard: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 12,
  },
  adminCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  adminCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  pendingChip: {
    backgroundColor: "#E3F2FD",
  },
  pendingChipText: {
    color: "#2196F3",
    fontWeight: "600",
  },
  adminInfoSection: {
    gap: 12,
    marginBottom: 16,
  },
  adminInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adminInfoLabel: {
    fontSize: 14,
    color: "#666",
    width: 60,
  },
  adminInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  selfieContainer: {
    marginVertical: 16,
  },
  selfieLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  adminSelfie: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  adminActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  approveButton: {
    flex: 1,
    backgroundColor: SUCCESS_COLOR,
  },
  rejectButton: {
    flex: 1,
    borderColor: ERROR_COLOR,
  },
  emptyCard: {
    elevation: 2,
    borderRadius: 12,
  },
  emptyCardContent: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCardText: {
    fontSize: 14,
    color: "#666",
  },
});