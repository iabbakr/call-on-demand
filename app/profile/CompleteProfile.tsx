import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db, storage } from "../../lib/firebase";
import { addBonusToUser } from "../../lib/rewards";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

export default function CompleteProfile() {
  const { user } = useAuth();
  const [address, setAddress] = useState("");
  const [nin, setNin] = useState("");
  const [bvn, setBvn] = useState("");
  const [dob, setDob] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<
    "pending" | "approved" | "rejected" | "incomplete"
  >("incomplete");

  useEffect(() => {
    if (!user) return;
    const loadUser = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setAddress(data.address || "");
        setNin(data.nin || "");
        setBvn(data.bvn || "");
        setDob(data.dob || "");
        setPhoto(data.selfie || null);
        setProfileStatus(data.profileStatus || "incomplete");
      }
    };
    loadUser();
  }, [user]);

  // ✅ Use camera instead of gallery
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Permission Denied", "Camera access is required to take a selfie.");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!user) return Alert.alert("Error", "User not found. Please sign in again.");

    if (!address || !nin || !bvn || !dob || !photo) {
      return Alert.alert("Missing Info", "Please fill out all fields and take your selfie.");
    }

    try {
      setUploading(true);

      let photoURL = photo;
      if (photo && !photo.startsWith("https")) {
        const res = await fetch(photo);
        const blob = await res.blob();
        const storageRef = ref(storage, `verifications/${user.uid}.jpg`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "users", user.uid), {
        address,
        nin,
        bvn,
        dob,
        selfie: photoURL,
        profileStatus: "pending",
      });

      Alert.alert("✅ Submitted", "Your verification has been sent for review.");
      setProfileStatus("pending");
    } catch (err) {
      console.error("Profile submission error:", err);
      Alert.alert("Error", "Failed to submit verification. Try again.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const rewardUserIfApproved = async () => {
      if (user && profileStatus === "approved") {
        await addBonusToUser(100);
      }
    };
    rewardUserIfApproved();
  }, [profileStatus, user]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text>Please log in to complete your profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.headerTitle}>Profile Verification</Text>

      <View style={styles.form}>
        <TextInput
          label="Address"
          mode="outlined"
          style={styles.input}
          value={address}
          onChangeText={setAddress}
        />
        <TextInput
          label="NIN"
          mode="outlined"
          style={styles.input}
          value={nin}
          onChangeText={setNin}
          keyboardType="numeric"
        />
        <TextInput
          label="BVN"
          mode="outlined"
          style={styles.input}
          value={bvn}
          onChangeText={setBvn}
          keyboardType="numeric"
        />
        <TextInput
          label="Date of Birth"
          placeholder="YYYY-MM-DD"
          mode="outlined"
          style={styles.input}
          value={dob}
          onChangeText={setDob}
        />

        {/* ✅ Take Photo with Camera */}
        <TouchableOpacity style={styles.uploadBox} onPress={takePhoto}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <Text style={styles.uploadText}>📸 Take a Selfie</Text>
          )}
        </TouchableOpacity>

        {profileStatus === "pending" && (
          <Button mode="contained" style={styles.disabledButton} disabled>
            Awaiting Approval
          </Button>
        )}

        {profileStatus === "approved" && (
          <Button mode="contained" style={styles.approvedButton} disabled>
            ✅ Approved — You earned 100 Coins!
          </Button>
        )}

        {(profileStatus === "rejected" || profileStatus === "incomplete") && (
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={uploading}
            disabled={uploading}
          >
            {profileStatus === "rejected" ? "Resubmit for Approval" : "Submit for Verification"}
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HEADER_BG, paddingHorizontal: 16, paddingTop: 50 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    textAlign: "center",
    marginBottom: 20,
  },
  form: { backgroundColor: BACKGROUND_COLOR, borderRadius: 12, padding: 16, elevation: 2 },
  input: { marginBottom: 16 },
  uploadBox: {
    height: 180,
    backgroundColor: HEADER_BG,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  uploadText: { color: "#555", fontSize: 15 },
  photo: { width: "100%", height: "100%", borderRadius: 10 },
  submitButton: { backgroundColor: PRIMARY_COLOR, marginTop: 8 },
  disabledButton: { backgroundColor: "#aaa", marginTop: 8 },
  approvedButton: { backgroundColor: "green", marginTop: 8 },
});
