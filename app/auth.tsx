import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useAuth } from "../context/AuthContext";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [menuVisible, setMenuVisible] = useState(false); // for Modal picker
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 🧠 Handle Sign Up
  const handleSignUp = async () => {
    try {
      // basic validation
      if (
        !fullName ||
        !username ||
        !phoneNumber ||
        !selectedState ||
        !email ||
        !password ||
        !confirmPassword ||
        !pin
      )
        return setError("Please fill out all required fields");

      if (password !== confirmPassword)
        return setError("Passwords do not match");

      if (pin.length !== 4) return setError("PIN must be exactly 4 digits");

      setError(null);

      // ✅ Pass extraData (matches AuthContext)
      await signUp(email, password, {
        fullName,
        username,
        phoneNumber,
        location: selectedState,
        pin,
        bankName,
        accountNumber,
      });

      router.replace("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 🧠 Handle Sign In
  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {isSignUp ? (
            <>
              {/* Full Name */}
              <TextInput
                label="Full Name"
                mode="outlined"
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
              />

              {/* Username */}
              <TextInput
                label="Username"
                mode="outlined"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
              />

              {/* Phone Number */}
              <TextInput
                label="Phone Number"
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />

              {/* 🔹 State Picker (Modal) */}
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                style={styles.dropdownAnchor}
              >
                <TextInput
                  label="Select State"
                  mode="outlined"
                  value={selectedState}
                  editable={false}
                  right={<TextInput.Icon icon="menu-down" />}
                />
              </TouchableOpacity>

              <Modal
                visible={menuVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setMenuVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    <ScrollView style={{ maxHeight: 400 }}>
                      {NIGERIAN_STATES.map((state) => (
                        <TouchableOpacity
                          key={state}
                          onPress={() => {
                            setSelectedState(state);
                            setMenuVisible(false);
                          }}
                          style={styles.modalItem}
                        >
                          <Text>{state}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <Button onPress={() => setMenuVisible(false)}>Cancel</Button>
                  </View>
                </View>
              </Modal>

              {/* Email */}
              <TextInput
                label="Email"
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              {/* Passwords */}
              <TextInput
                label="Password"
                mode="outlined"
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                label="Confirm Password"
                mode="outlined"
                style={styles.input}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              {/* PIN */}
              <TextInput
                label="Create 4-Digit PIN"
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                value={pin}
                onChangeText={setPin}
              />

              {/* Optional Bank Info */}
              <Text style={{ marginVertical: 10, fontWeight: "bold" }}>
                Link Your Bank Account (Optional)
              </Text>

              <TextInput
                label="Bank Name"
                mode="outlined"
                style={styles.input}
                value={bankName}
                onChangeText={setBankName}
              />
              <TextInput
                label="Account Number"
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                maxLength={10}
                value={accountNumber}
                onChangeText={setAccountNumber}
              />

              {/* Submit */}
              <Button
                mode="contained"
                onPress={handleSignUp}
                style={styles.button}
              >
                Sign Up
              </Button>
            </>
          ) : (
            <>
              <TextInput
                label="Email"
                mode="outlined"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                label="Password"
                mode="outlined"
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Button
                mode="contained"
                onPress={handleSignIn}
                style={styles.button}
              >
                Sign In
              </Button>
            </>
          )}

          {/* Toggle Auth Mode */}
          <View style={styles.toggleContainer}>
            <Text>
              {isSignUp
                ? "Already have an account?"
                : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.toggleButton}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  content: { width: "100%" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#333" },
  errorText: { color: "red", marginBottom: 10, textAlign: "center" },
  input: { marginBottom: 16 },
  button: { marginTop: 8, backgroundColor: "#6200EE", paddingVertical: 5 },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  toggleButton: {
    color: "#6200EE",
    marginLeft: 5,
    fontWeight: "bold",
  },
  dropdownAnchor: { marginBottom: 16 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 10,
    padding: 10,
    elevation: 5,
  },
  modalItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
