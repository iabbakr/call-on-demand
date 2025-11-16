import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail } from "firebase/auth";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useAuth } from "../../../context/AuthContext";

const PRIMARY_COLOR = "#6200EE";  

export default function ChangeEmail() {
  const router = useRouter();
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Change Email",
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
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flex: 1 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { marginBottom: 15 },
});
