import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

interface UserData {
  fullName: string;
  username: string;
  phoneNumber: string;
  location: string;
  bankName?: string;
  accountNumber?: string;
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.headerTitle}>Account Information</Text>

      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Text style={styles.label}>Full Name</Text>
          <Text style={styles.value}>{userData?.fullName || "N/A"}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.profileRow}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>@{userData?.username || "N/A"}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.profileRow}>
          <Text style={styles.label}>Phone Number</Text>
          <Text style={styles.value}>{userData?.phoneNumber || "N/A"}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.profileRow}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{userData?.location || "N/A"}</Text>
        </View>

        {userData?.bankName && (
          <>
            <View style={styles.divider} />
            <View style={styles.profileRow}>
              <Text style={styles.label}>Bank Name</Text>
              <Text style={styles.value}>{userData.bankName}</Text>
            </View>
          </>
        )}

        {userData?.accountNumber && (
          <>
            <View style={styles.divider} />
            <View style={styles.profileRow}>
              <Text style={styles.label}>Account Number</Text>
              <Text style={styles.value}>{userData.accountNumber}</Text>
            </View>
          </>
        )}
      </View>

      <Button
        mode="contained"
        style={styles.backBtn}
        onPress={() => router.back()}
        buttonColor={PRIMARY_COLOR}
      >
        Back to Profile
      </Button>
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
  profileCard: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
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
  },
  divider: {
    height: 1,
    backgroundColor: HEADER_BG,
  },
  backBtn: {
    marginTop: 30,
    alignSelf: "center",
    width: "60%",
    borderRadius: 8,
  },
});
