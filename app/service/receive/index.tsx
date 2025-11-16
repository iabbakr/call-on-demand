import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";

const PRIMARY_COLOR = "#6200EE";
const PRIMARY_LIGHT = "#7C3AED";
const BACKGROUND_COLOR = "#FFFFFF";
const SURFACE_COLOR = "#F8F9FA";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_SECONDARY = "#6B7280";
const SHADOW_COLOR = "#000";

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
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.keyboardView}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Receive Coins",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable 
              onPress={() => router.back()} 
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />
      
      <View style={styles.container}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <View style={styles.balanceRow}>
            <FontAwesome5 name="coins" size={20} color={BACKGROUND_COLOR} />
            <Text style={styles.balanceAmount}>
              {balance?.toLocaleString() || "0"}
            </Text>
          </View>
        </View>

        {/* Username Card */}
        <View style={styles.usernameCard}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="account-circle" size={48} color={PRIMARY_COLOR} />
          </View>
          
          <Text style={styles.label}>Your Username</Text>
          <Text selectable style={styles.username}>
            @{userProfile?.username || "Unavailable"}
          </Text>

          <Pressable 
            style={({ pressed }) => [
              styles.copyButton,
              pressed && styles.copyButtonPressed
            ]} 
            onPress={handleCopy}
          >
            <MaterialIcons name="content-copy" size={20} color={BACKGROUND_COLOR} />
            <Text style={styles.copyText}>Copy Username</Text>
          </Pressable>
        </View>

        {/* Info Tip */}
        <View style={styles.tipContainer}>
          <MaterialIcons name="info-outline" size={20} color={PRIMARY_COLOR} />
          <Text style={styles.tip}>
            Share your username with another user to receive funds directly to your account.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: SURFACE_COLOR,
  },
  backButton: {
    paddingLeft: 8,
  },
  balanceCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    color: BACKGROUND_COLOR,
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balanceAmount: {
    color: BACKGROUND_COLOR,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  usernameCard: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 16,
  },
  label: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: 20,
  },
  copyButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  copyButtonPressed: {
    backgroundColor: PRIMARY_LIGHT,
    transform: [{ scale: 0.98 }],
  },
  copyText: {
    color: BACKGROUND_COLOR,
    fontWeight: "700",
    fontSize: 15,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 24,
    padding: 16,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY_COLOR,
  },
  tip: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SECONDARY,
  },
});