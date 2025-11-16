import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";

export default function ChangePin() {
  const router = useRouter();
  const { user } = useAuth();
  const [password, setPassword] = useState(""); // user's current password
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const handleChange = async () => {
  
    if (!password || !newPin || !confirmPin)
      return Alert.alert("Error", "Please fill all fields.");
    if (newPin !== confirmPin)
      return Alert.alert("Error", "New PINs do not match.");
    if (newPin.length !== 4)
      return Alert.alert("Error", "PIN must be 4 digits.");

    try {
      // Re-authenticate the user with their password
      const credential = EmailAuthProvider.credential(user!.email!, password);
      await reauthenticateWithCredential(user!, credential);

      // Update PIN in Firestore
      const userRef = doc(db, "users", user!.uid);
      await updateDoc(userRef, { pin: newPin, lastPinChange: new Date().toISOString() });

      Alert.alert("Success", "PIN updated successfully!");
      setPassword("");
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        Alert.alert("Error", "Incorrect password.");
      } else {
        Alert.alert("Error", "Failed to update PIN. Try again.");
      }
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Change PIN",
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
        label="Your Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TextInput
        label="New PIN"
        value={newPin}
        onChangeText={setNewPin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={4}
        style={styles.input}
      />

      <TextInput
        label="Confirm New PIN"
        value={confirmPin}
        onChangeText={setConfirmPin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={4}
        style={styles.input}
      />

      <Button mode="contained" onPress={handleChange}>
        Update PIN
      </Button>
    </View>
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { marginBottom: 15 },
});
