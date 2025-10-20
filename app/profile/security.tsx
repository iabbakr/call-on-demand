import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text, TextInput } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

export default function SecuritySettings() {
  const { user } = useAuth();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastChanged, setLastChanged] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchPinInfo = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setLastChanged(data?.lastPinChange || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPinInfo();
  }, [user]);

  const handlePinChange = async () => {
    if (!newPin || newPin.length !== 4) {
      Alert.alert("Error", "PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert("Error", "PINs do not match.");
      return;
    }

    try {
      const ref = doc(db, "users", user!.uid);
      await updateDoc(ref, {
        pin: newPin,
        lastPinChange: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      Alert.alert("Success", "Your PIN has been updated.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setLastChanged(new Date().toISOString());
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update PIN. Try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Security Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Change Transaction PIN</Text>
        <TextInput
          label="Current PIN"
          value={currentPin}
          secureTextEntry
          maxLength={4}
          keyboardType="numeric"
          onChangeText={setCurrentPin}
          style={styles.input}
        />
        <TextInput
          label="New PIN"
          value={newPin}
          secureTextEntry
          maxLength={4}
          keyboardType="numeric"
          onChangeText={setNewPin}
          style={styles.input}
        />
        <TextInput
          label="Confirm New PIN"
          value={confirmPin}
          secureTextEntry
          maxLength={4}
          keyboardType="numeric"
          onChangeText={setConfirmPin}
          style={styles.input}
        />

        <Button mode="contained" onPress={handlePinChange} style={styles.btn}>
          Update PIN
        </Button>

        {lastChanged && (
          <Text style={styles.lastChange}>
            Last changed: {new Date(lastChanged).toLocaleString()}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, backgroundColor: "#F5F5F5" },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    marginBottom: 12,
  },
  btn: {
    marginTop: 10,
  },
  lastChange: {
    textAlign: "center",
    color: "gray",
    marginTop: 10,
  },
});
