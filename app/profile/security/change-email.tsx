import { EmailAuthProvider, reauthenticateWithCredential, updateEmail } from "firebase/auth";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useAuth } from "../../../context/AuthContext";

export default function ChangeEmail() {
  const { user } = useAuth();
  const [password, setPassword] = useState(""); // user's current password
  const [email, setEmail] = useState("");

  const handleChange = async () => {
    if (!email.includes("@")) return Alert.alert("Error", "Enter a valid email");
    if (!password) return Alert.alert("Error", "Enter your current password");

    try {
      // Re-authenticate the user with their password
      const credential = EmailAuthProvider.credential(user!.email!, password);
      await reauthenticateWithCredential(user!, credential);

      // Update email
      await updateEmail(user!, email);

      Alert.alert("Success", "Email updated successfully!");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        Alert.alert("Error", "Incorrect password.");
      } else if (err.code === "auth/email-already-in-use") {
        Alert.alert("Error", "This email is already in use.");
      } else {
        Alert.alert("Error", "Failed to update email. Try again.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Email</Text>

      <TextInput
        label="Current Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TextInput
        label="New Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.input}
      />

      <Button mode="contained" onPress={handleChange}>
        Update Email
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flex: 1 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { marginBottom: 15 },
});
