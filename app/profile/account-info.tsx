import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Divider, Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

interface UserData {
  fullName?: string;
  username?: string;
  gender?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  nin?: string;
  bvn?: string;
  address?: string;
  location?: string;
  bankName?: string;
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
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert("Copied", "Referral code copied to clipboard!");
  };

  const renderRow = (label: string, value?: string, isReferral?: boolean) => (
    <View style={styles.profileRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={styles.value}>{value || "N/A"}</Text>
        {isReferral && value && (
          <TouchableOpacity
            onPress={() => copyToClipboard(value)}
            style={{ marginLeft: 10 }}
          >
            <Text style={{ color: PRIMARY_COLOR, fontWeight: "bold" }}>Copy</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.headerTitle}>Account Information</Text>

      {/* --- PERSONAL DETAILS --- */}
      <Card style={styles.card}>
        <Card.Title title="Personal Information" titleStyle={styles.sectionTitle} />
        <Card.Content>
          {renderRow("Full Name", userData?.fullName)}
          <Divider style={styles.divider} />
          {renderRow("Username", userData?.username ? `@${userData.username}` : undefined)}
          <Divider style={styles.divider} />
          {renderRow("Email", userData?.email)}
          <Divider style={styles.divider} />
          {renderRow("Mobile Number", userData?.phoneNumber)}
          <Divider style={styles.divider} />
          {renderRow("Gender", userData?.gender)}
          <Divider style={styles.divider} />
          {renderRow("Date of Birth", userData?.dateOfBirth)}
          <Divider style={styles.divider} />
          {renderRow("NIN", userData?.nin)}
          <Divider style={styles.divider} />
          {renderRow("BVN", userData?.bvn)}
          <Divider style={styles.divider} />
          {renderRow("Address", userData?.address)}
          <Divider style={styles.divider} />
          {renderRow("Location", userData?.location)}
          <Divider style={styles.divider} />
          {renderRow("Referral Code", userData?.referralCode, true)}
        </Card.Content>
      </Card>

      {/* --- BANK DETAILS --- */}
      <Card style={[styles.card, { marginTop: 25 }]}>
        <Card.Title title="Bank Details" titleStyle={styles.sectionTitle} />
        <Card.Content>
          {renderRow("Bank Name", userData?.bankName)}
          <Divider style={styles.divider} />
          {renderRow("Account Number", userData?.accountNumber)}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HEADER_BG,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  label: {
    fontSize: 15,
    color: INACTIVE_COLOR,
    fontWeight: "500",
  },
  value: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: HEADER_BG,
    marginVertical: 4,
  },
});
