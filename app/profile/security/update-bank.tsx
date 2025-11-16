// app/profile/security/update-bank.tsx
import { MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { Stack, useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { auth } from "../../../lib/firebase"; // make sure you export auth instance

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";



export default function UpdateBank() {
  const router = useRouter();
  const { userProfile, updateUserProfile } = useApp();

  const [bankList, setBankList] = useState<any[]>([]);
  const [bankModal, setBankModal] = useState(false);

  const [selectedBank, setSelectedBank] = useState<any>({
    name: userProfile?.bankName || "",
    code: userProfile?.bankCode || ""
  });
  const [accountNumber, setAccountNumber] = useState(userProfile?.accountNumber || "");
  const [accountName, setAccountName] = useState(userProfile?.accountName || "");
  const [verifying, setVerifying] = useState(false);
  const [nameVerified, setNameVerified] = useState(true); // assume previous name is verified
  const [loading, setLoading] = useState(false);

  // Password re-auth
  const [password, setPassword] = useState("");
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  // Fetch banks from Paystack
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await axios.get("https://api.paystack.co/bank", {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY}`,
          },
        });
        setBankList(res.data.data);
      } catch (e) {
        console.error("Failed to load banks", e);
      }
    };
    fetchBanks();
  }, []);

  const verifyNameMatch = (userFullName: string, paystackName: string) => {
    const normalize = (name: string) =>
      name.toLowerCase().trim().replace(/\s+/g, " ").split(" ").filter(w => w.length > 1);
    const userNames = normalize(userFullName);
    const paystackNames = normalize(paystackName);
    let matchCount = 0;
    userNames.forEach(n => { if (paystackNames.includes(n)) matchCount++; });
    return matchCount >= 2;
  };

  const verifyAccount = async () => {
    if (!selectedBank?.code || !accountNumber) return;
    try {
      setVerifying(true);
      setNameVerified(false);
      const response = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${selectedBank.code}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY}`,
          },
        }
      );
      const name = response.data.data.account_name;
      setAccountName(name);

      const match = verifyNameMatch(userProfile?.fullName || "", name);
      setNameVerified(match);

      if (!match) {
        Alert.alert("❌ Name Verification Failed", `Your full name does not match the account name (${name}). At least 2 names must match.`);
        return;
      }

      Alert.alert("✅ Account Verified", `Account Name: ${name}\nName verification successful!`);
    } catch (err: any) {
      Alert.alert("❌ Verification Failed", err.response?.data?.message || "Could not verify account");
    } finally {
      setVerifying(false);
    }
  };

  // Trigger password modal
  const handleUpdate = () => {
    if (!selectedBank?.name || !selectedBank?.code || !accountNumber || !accountName) {
      return Alert.alert("Invalid Input", "Please fill in all fields and verify your account.");
    }
    if (!nameVerified) return Alert.alert("Verification Required", "Please verify your account name.");
    setAuthModalVisible(true);
  };

  // Re-authenticate and update bank
  const reauthenticateAndUpdateBank = async () => {
    if (!password) return Alert.alert("Error", "Please enter your password.");

    try {
      setAuthenticating(true);
      const credential = EmailAuthProvider.credential(userProfile?.email!, password);
      await reauthenticateWithCredential(auth.currentUser!, credential);

      // Password correct, update bank
      await updateUserProfile({
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        accountNumber,
        accountName,
      });

      Alert.alert("✅ Success", "Bank details updated successfully.");
      setAuthModalVisible(false);
      setPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        Alert.alert("Error", "Incorrect password.");
      } else {
        Alert.alert("Error", "Failed to update bank details. Try again.");
      }
    } finally {
      setAuthenticating(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
    <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Change Bank Account",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.back()} >
                <MaterialIcons name="arrow-back" size={24} color="#fff" style={{ paddingLeft: 5 }} />
              </Pressable>
            );
          },
          
    
        }}
      />
    <ScrollView contentContainerStyle={styles.container}>
    

      <View style={styles.form}>
        <TouchableOpacity onPress={() => setBankModal(true)}>
          <TextInput
            label="Select Bank"
            mode="outlined"
            value={selectedBank?.name || ""}
            editable={false}
            right={<TextInput.Icon icon="menu-down" />}
            style={styles.input}
          />
        </TouchableOpacity>

        <TextInput
          label="Account Number"
          mode="outlined"
          keyboardType="numeric"
          maxLength={10}
          value={accountNumber}
          onChangeText={(text) => {
            setAccountNumber(text);
            if (text.length !== 10) {
              setAccountName("");
              setNameVerified(false);
            }
          }}
          style={styles.input}
        />

        {accountNumber.length === 10 && !accountName && (
          <Button
            mode="outlined"
            onPress={verifyAccount}
            loading={verifying}
            disabled={verifying}
            style={styles.verifyButton}
          >
            🔍 Verify Account
          </Button>
        )}

        {accountName && (
          <View style={[styles.verifiedBanner, !nameVerified && styles.failedBanner]}>
            <View style={[styles.verifiedIcon, !nameVerified && styles.failedIcon]}>
              <Text style={styles.verifiedIconText}>{nameVerified ? "✓" : "✕"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifiedLabel}>Account Name</Text>
              <Text style={[styles.verifiedName, !nameVerified && styles.failedName]}>{accountName}</Text>
              <Text style={nameVerified ? styles.verifiedMatch : styles.failedMatch}>
                {nameVerified ? "✓ Name verified successfully" : "✕ At least 2 names must match"}
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleUpdate}
          disabled={loading || !nameVerified}
        >
          {loading ? <ActivityIndicator color={BACKGROUND_COLOR} /> : <Text style={styles.buttonText}>Update Bank</Text>}
        </Pressable>
      </View>

      {/* Password Re-auth Modal */}
      <Modal visible={authModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Password</Text>
            <TextInput
              label="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={{ marginBottom: 16 }}
            />
            <Button
              mode="contained"
              onPress={reauthenticateAndUpdateBank}
              loading={authenticating}
            >
              Confirm
            </Button>
            <Button onPress={() => setAuthModalVisible(false)} style={{ marginTop: 8 }}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      {/* Bank Selection Modal */}
      <Modal visible={bankModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Bank</Text>
            <FlatList
              data={bankList}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedBank(item);
                    setBankModal(false);
                  }}
                  style={styles.modalItem}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
            <Button onPress={() => setBankModal(false)} style={{ marginTop: 16 }}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#F5F5F5" },
  header: { fontSize: 22, fontWeight: "bold", color: PRIMARY_COLOR, marginBottom: 30, textAlign: "center" },
  form: { backgroundColor: BACKGROUND_COLOR, padding: 16, borderRadius: 10 },
  input: { marginTop: 6, backgroundColor: BACKGROUND_COLOR },
  button: { marginTop: 20, backgroundColor: PRIMARY_COLOR, padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: BACKGROUND_COLOR, fontWeight: "700", fontSize: 16 },
  verifyButton: { marginTop: 8, borderColor: PRIMARY_COLOR },
  verifiedBanner: { backgroundColor: `${SUCCESS_COLOR}15`, borderWidth: 1, borderColor: `${SUCCESS_COLOR}40`, borderRadius: 8, padding: 12, marginTop: 8, flexDirection: "row", alignItems: "center" },
  failedBanner: { backgroundColor: `${ERROR_COLOR}15`, borderColor: `${ERROR_COLOR}40` },
  verifiedIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: SUCCESS_COLOR, justifyContent: "center", alignItems: "center", marginRight: 12 },
  failedIcon: { backgroundColor: ERROR_COLOR },
  verifiedIconText: { color: BACKGROUND_COLOR, fontSize: 18, fontWeight: "700" },
  verifiedLabel: { fontSize: 12, color: "#757575", marginBottom: 4 },
  verifiedName: { fontSize: 15, fontWeight: "600", color: SUCCESS_COLOR, marginBottom: 4 },
  failedName: { color: ERROR_COLOR },
  verifiedMatch: { fontSize: 12, color: SUCCESS_COLOR, fontWeight: "500" },
  failedMatch: { fontSize: 12, color: ERROR_COLOR, fontWeight: "500" },
  modalOverlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 },
  modalContainer: { backgroundColor: BACKGROUND_COLOR, borderRadius: 16, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "600", marginBottom: 16 },
  modalItem: { paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: ACCENT_COLOR },
  modalItemText: { fontSize: 15 },
});
