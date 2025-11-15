import * as ImagePicker from "expo-image-picker";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
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
import { Button, Card, Text, TextInput } from "react-native-paper";
import { useApp } from "../../context/AppContext";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";

export default function AddFundsScreen() {
  const { userProfile } = useApp();
  const { refreshBalance } = useApp();
  const [amount, setAmount] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const BANK_DETAILS = [
    { bankName: "Jaiz Bank", accountName: "callondemand", accountNumber: "8140002708" },
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Permission Required", "We need permission to access your photos.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const uri = result.assets[0].uri;
        const url = await uploadImageToCloudinary(uri, "payment_proofs");
        setProofImage(url);
        Alert.alert("Uploaded", "Proof of payment uploaded successfully!");
      } catch (err) {
        console.error("Upload error:", err);
        Alert.alert("Error", "Failed to upload proof of payment.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleConfirmPayment = async () => {
    if (!userProfile) return;
    if (!amount || Number(amount) <= 0) {
      return Alert.alert("Invalid Amount", "Please enter a valid amount.");
    }
    if (!proofImage) {
      return Alert.alert("Missing Proof", "Please upload proof of payment.");
    }

    try {
      setUploading(true);
      // Save payment request to Firestore
      await addDoc(collection(db, "users", userProfile.uid, "payments"), {
        amount: Number(amount),
        proof: proofImage,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Payment Submitted",
        "Your payment is pending approval by admin."
      );

      // Reset form
      setAmount("");
      setProofImage(null);
    } catch (err) {
      console.error("Payment request error:", err);
      Alert.alert("Error", "Failed to submit payment request.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F5F5F5" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Add Funds via Bank Transfer</Text>

        <TextInput
          label="Amount (₦)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />

        <Card style={styles.card}>
          <Card.Title title="Bank Details" titleStyle={{ fontWeight: "bold" }} />
          <Card.Content>
            {BANK_DETAILS.map((bank, idx) => (
              <View key={idx} style={{ marginBottom: 8 }}>
                <Text>Bank Name: {bank.bankName}</Text>
                <Text>Account Name: {bank.accountName}</Text>
                <Text>Account Number: {bank.accountNumber}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        <TouchableOpacity
          style={styles.uploadBox}
          onPress={pickImage}
          disabled={uploading}
        >
          {proofImage ? (
            <Image source={{ uri: proofImage }} style={styles.photo} />
          ) : (
            <Text style={styles.uploadText}>📸 Upload Proof of Payment</Text>
          )}
        </TouchableOpacity>

        <Button
          mode="contained"
          onPress={handleConfirmPayment}
          loading={uploading}
          disabled={uploading}
          style={styles.submitBtn}
        >
          Confirm Payment
        </Button>

        <Text style={styles.tip}>
          Once submitted, your payment will be reviewed by admin. On approval, your balance will be updated.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", color: PRIMARY_COLOR, marginBottom: 16 },
  input: { backgroundColor: BACKGROUND_COLOR, marginBottom: 16 },
  card: { backgroundColor: BACKGROUND_COLOR, borderRadius: 12, marginBottom: 16, padding: 8 },
  uploadBox: {
    height: 180,
    backgroundColor: "#EEE",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  uploadText: { color: "#555" },
  photo: { width: "100%", height: 180, borderRadius: 10 },
  submitBtn: { backgroundColor: PRIMARY_COLOR, marginBottom: 16 },
  tip: { fontSize: 12, color: "#666", marginTop: 8 },
});
