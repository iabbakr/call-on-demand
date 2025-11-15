import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Divider, Text } from "react-native-paper";
import { db } from "../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const HEADER_BG = "#F5F5F5";
const BACKGROUND_COLOR = "#FFFFFF";

// ✅ Define a type for the user
type PendingUser = {
  id: string;
  fullName?: string;
  email?: string;
  address?: string;
  nin?: string;
  bvn?: string;
  dob?: string;
  selfie?: string;
};

export default function VerificationRequests() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Load pending verifications
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const q = query(collection(db, "users"), where("profileStatus", "==", "pending"));
        const snapshot = await getDocs(q);
        const users: PendingUser[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PendingUser, "id">),
        }));
        setPendingUsers(users);
      } catch (error) {
        console.error("Error fetching pending users:", error);
        Alert.alert("Error", "Failed to load pending verifications.");
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  // ✅ Approve or reject
  const handleDecision = async (uid: string, decision: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "users", uid), { profileStatus: decision });
      Alert.alert(
        decision === "approved" ? "✅ Approved" : "❌ Rejected",
        `User has been ${decision}.`
      );
      setPendingUsers((prev) => prev.filter((u) => u.id !== uid));
    } catch (err) {
      console.error("Approval error:", err);
      Alert.alert("Error", "Failed to update user status.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading pending verifications...</Text>
      </View>
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: PRIMARY_COLOR, fontWeight: "bold" }}>
          No pending verifications 🎉
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Pending Verifications</Text>

      {pendingUsers.map((u) => (
        <Card key={u.id} style={styles.card}>
          <Card.Title title={u.fullName || "Unnamed User"} subtitle={u.email} />
          <Card.Content>
            <Divider style={styles.divider} />
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{u.address || "N/A"}</Text>

            <Text style={styles.label}>NIN:</Text>
            <Text style={styles.value}>{u.nin || "N/A"}</Text>

            <Text style={styles.label}>BVN:</Text>
            <Text style={styles.value}>{u.bvn || "N/A"}</Text>

            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{u.dob || "N/A"}</Text>

            {u.selfie && (
              <View style={{ marginTop: 10, alignItems: "center" }}>
                <Image
                  source={{ uri: u.selfie }}
                  style={{ width: 150, height: 180, borderRadius: 8 }}
                  resizeMode="cover"
                />
              </View>
            )}

            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                style={[styles.button, { backgroundColor: "green" }]}
                onPress={() => handleDecision(u.id, "approved")}
              >
                Approve
              </Button>
              <Button
                mode="contained"
                style={[styles.button, { backgroundColor: "red" }]}
                onPress={() => handleDecision(u.id, "rejected")}
              >
                Reject
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HEADER_BG, padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    marginBottom: 16,
  },
  label: { fontSize: 15, fontWeight: "600", marginTop: 6 },
  value: { fontSize: 14, color: "#333" },
  divider: { marginBottom: 10 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  button: { flex: 0.45 },
});
