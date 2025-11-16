import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

export default function ReceivePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { balance, userProfile } = useApp();

  const handleCopy = async () => {
    if (!userProfile?.username) return;
    await Clipboard.setStringAsync(userProfile.username);
    Alert.alert("Copied", "Your username has been copied to clipboard.");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Receive Coins",
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
    <View style={styles.container}>
     

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={{ color: BACKGROUND_COLOR, fontSize: 12 }}>Wallet Balance</Text>
        <Text style={{ color: BACKGROUND_COLOR, fontSize: 20, fontWeight: "700" }}>
          <FontAwesome5 name="coins" size={16} color={BACKGROUND_COLOR} />{" "}
          {balance?.toLocaleString() || "0"}
        </Text>
      </View>

      {/* Username Info */}
      <View style={styles.infoBox}>
        <Text style={styles.label}>Your Username</Text>
        <Text selectable style={styles.value}>
          {userProfile?.username || "Unavailable"}
        </Text>

        <Pressable style={styles.copyButton} onPress={handleCopy}>
          <MaterialIcons name="content-copy" size={18} color={BACKGROUND_COLOR} />
          <Text style={styles.copyText}>Copy Username</Text>
        </Pressable>
      </View>

      <Text style={styles.tip}>
        Share your username with another user to receive funds directly to your account.
      </Text>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: HEADER_BG },
  header: { fontSize: 18, fontWeight: "700", color: PRIMARY_COLOR, marginBottom: 16 },
  balanceCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  label: { color: "#777", marginBottom: 4 },
  value: {
    fontSize: 16,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    textAlign: "center",
  },
  copyButton: {
    marginTop: 12,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copyText: { color: BACKGROUND_COLOR, fontWeight: "700" },
  tip: { marginTop: 20, textAlign: "center", color: "#555" },
});
