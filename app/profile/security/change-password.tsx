import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from "react-native";
import { ActivityIndicator, Button, TextInput } from "react-native-paper";
import { auth } from "../../../lib/firebase"; // adjust path if different

const PRIMARY_COLOR = "#6200EE";  

export default function ChangePassword() {
  const router = useRouter(); 
  const user = auth.currentUser;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!user) {
      Alert.alert("Error", "No user is logged in.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      Alert.alert("✅ Success", "Your password has been changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "Incorrect current password.");
      } else if (error.code === "auth/too-many-requests") {
        Alert.alert("Error", "Too many attempts. Try again later.");
      } else {
        Alert.alert("Error", "Failed to change password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Change Password",
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
    <ScrollView contentContainerStyle={styles.container}>
      
      <TextInput
        label="Current Password"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
        style={styles.input}
      />
      <TextInput
        label="New Password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        style={styles.input}
      />
      <TextInput
        label="Confirm New Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleChangePassword}
        style={styles.btn}
        disabled={loading}
      >
        {loading ? <ActivityIndicator animating color="#fff" /> : "Update Password"}
      </Button>
    </ScrollView>
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#6200EE",
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  btn: {
    marginTop: 10,
    backgroundColor: "#6200EE",
    paddingVertical: 8,
  },
});
