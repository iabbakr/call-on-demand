import { FontAwesome5 } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Card, Chip, Divider, Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";

interface UserData {
  fullName?: string;
  username?: string;
  gender?: string;
  dob?: string;
  phoneNumber?: string;
  nin?: string;
  bvn?: string;
  address?: string;
  location?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  email?: string;
  referralCode?: string;
}

export default function AccountInfo() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUser = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        }
      } catch (error) {
        console.error("Error loading account info:", error);
        Alert.alert("Error", "Failed to load your account information.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading account info...</Text>
      </View>
    );
  }

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("✅ Copied", `${label} copied to clipboard!`);
  };

  const maskSensitiveData = (data?: string) => {
    if (!data) return "N/A";
    if (data.length <= 4) return data;
    return "•••" + data.slice(-4);
  };

  const renderInfoRow = (
    icon: string,
    label: string,
    value?: string,
    copyable?: boolean,
    sensitive?: boolean
  ) => {
    const displayValue = sensitive ? maskSensitiveData(value) : (value || "Not provided");
    
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name={icon} size={16} color={PRIMARY_COLOR} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {displayValue}
            </Text>
          </View>
        </View>
        {copyable && value && (
          <TouchableOpacity
            onPress={() => copyToClipboard(value, label)}
            style={styles.copyButton}
          >
            <FontAwesome5 name="copy" size={16} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Information</Text>
        <Text style={styles.headerSubtitle}>View and manage your details</Text>
      </View>

      {/* Personal Information */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <FontAwesome5 name="user" size={20} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>

          {renderInfoRow("user", "Full Name", userData?.fullName)}
          <Divider style={styles.divider} />
          {renderInfoRow("at", "Username", userData?.username ? `@${userData.username}` : undefined)}
          <Divider style={styles.divider} />
          {renderInfoRow("envelope", "Email", userData?.email, true)}
          <Divider style={styles.divider} />
          {renderInfoRow("phone", "Mobile Number", userData?.phoneNumber, true)}
          <Divider style={styles.divider} />
          {renderInfoRow("venus-mars", "Gender", userData?.gender)}
          <Divider style={styles.divider} />
          {renderInfoRow("calendar", "Date of Birth", userData?.dob)}
        </Card.Content>
      </Card>

      {/* Identification */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <FontAwesome5 name="id-card" size={20} color="#2196F3" />
            </View>
            <Text style={styles.cardTitle}>Identification</Text>
          </View>

          {renderInfoRow("id-card", "NIN", userData?.nin, false, true)}
          <Divider style={styles.divider} />
          {renderInfoRow("id-badge", "BVN", userData?.bvn, false, true)}
        </Card.Content>
      </Card>

      {/* Location */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <FontAwesome5 name="map-marker-alt" size={20} color="#FF9800" />
            </View>
            <Text style={styles.cardTitle}>Location</Text>
          </View>

          {renderInfoRow("home", "Address", userData?.address)}
          <Divider style={styles.divider} />
          {renderInfoRow("map-pin", "City/State", userData?.location)}
        </Card.Content>
      </Card>

      {/* Bank Details */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <FontAwesome5 name="university" size={20} color={SUCCESS_COLOR} />
            </View>
            <Text style={styles.cardTitle}>Bank Details</Text>
          </View>

          {renderInfoRow("building", "Bank Name", userData?.bankName)}
          <Divider style={styles.divider} />
          {renderInfoRow("user-circle", "Account Name", userData?.accountName)}
          <Divider style={styles.divider} />
          {renderInfoRow("credit-card", "Account Number", userData?.accountNumber, true)}
        </Card.Content>
      </Card>

      {/* Referral Code */}
      {userData?.referralCode && (
        <Card style={[styles.card, styles.referralCard]}>
          <Card.Content>
            <View style={styles.referralHeader}>
              <FontAwesome5 name="gift" size={24} color={PRIMARY_COLOR} />
              <Text style={styles.referralTitle}>Your Referral Code</Text>
            </View>
            <View style={styles.referralCodeContainer}>
              <Text style={styles.referralCode}>{userData.referralCode}</Text>
              <Button
                mode="contained"
                icon="share"
                onPress={() => copyToClipboard(userData.referralCode!, "Referral code")}
                style={styles.shareButton}
                compact
              >
                Share
              </Button>
            </View>
            <Text style={styles.referralHint}>
              Share this code with friends and earn rewards!
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Account Status */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Chip
                icon="check-circle"
                style={styles.statusChip}
                textStyle={styles.statusChipText}
              >
                Verified
              </Chip>
            </View>
            <View style={styles.statusItem}>
              <Chip
                icon="shield-check"
                style={[styles.statusChip, { backgroundColor: "#E8F5E9" }]}
                textStyle={[styles.statusChipText, { color: SUCCESS_COLOR }]}
              >
                Secure
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <FontAwesome5 name="info-circle" size={16} color={INACTIVE_COLOR} />
        <Text style={styles.helpText}>
          To update your information, please contact support or visit your profile settings.
        </Text>
      </View>
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
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: INACTIVE_COLOR,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: INACTIVE_COLOR,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  referralCard: {
    backgroundColor: ACCENT_COLOR,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  referralCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BACKGROUND_COLOR,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    letterSpacing: 2,
  },
  shareButton: {
    borderRadius: 8,
  },
  referralHint: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
  },
  statusItem: {
    flex: 1,
  },
  statusChip: {
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
  },
  statusChipText: {
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
});