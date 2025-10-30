import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";

export default function ChangeMobile() {
  const { user } = useAuth();
  const [password, setPassword] = useState(""); // current password
  const [phone, setPhone] = useState("");

  const handleChange = async () => {
    if (!phone.match(/^\d{10,}$/)) {
      Alert.alert("Error", "Enter a valid phone number");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Enter your current password");
      return;
    }

    try {
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user!.email!, password);
      await reauthenticateWithCredential(user!, credential);

      // Update phone number in Firestore
      const ref = doc(db, "users", user!.uid);
      await updateDoc(ref, { phone });

      Alert.alert("Success", "Mobile number updated successfully!");
      setPhone("");
      setPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        Alert.alert("Error", "Incorrect password.");
      } else {
        Alert.alert("Error", "Failed to update mobile number.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Mobile Number</Text>

      <TextInput
        label="Current Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TextInput
        label="New Mobile Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <Button mode="contained" onPress={handleChange}>
        Update Mobile Number
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flex: 1 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { marginBottom: 15 },
});
