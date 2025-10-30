import axios from "axios";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
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

const GENDER_OPTIONS = ["Male", "Female"];

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [genderModal, setGenderModal] = useState(false);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [bankList, setBankList] = useState<any[]>([]);
  const [bankModal, setBankModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  /**
   * 🔹 Fetch Paystack Bank List
   */
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await axios.get("https://api.paystack.co/bank", {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY}`,
          },
        });
        setBankList(res.data.data);
      } catch (e) {
        console.error("Failed to load banks", e);
      }
    };
    fetchBanks();
  }, []);

  /**
   * ✅ Verify bank account using Paystack
   */
  const verifyAccount = async () => {
    if (!selectedBank || !accountNumber) return null;
    try {
      setVerifying(true);
      const response = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${selectedBank.code}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY}`,
          },
        }
      );
      const { account_name } = response.data.data;
      setAccountName(account_name);
      Alert.alert("✅ Account Verified", `Account Name: ${account_name}`);
      return account_name;
    } catch (err: any) {
      Alert.alert("❌ Verification failed", err.response?.data?.message || "Could not verify account");
      return null;
    } finally {
      setVerifying(false);
    }
  };

  /**
   * 🔹 Handle sign-up
   */
  const handleSignUp = async () => {
    try {
      if (
        !fullName ||
        !username ||
        !phoneNumber ||
        !selectedState ||
        !email ||
        !password ||
        !confirmPassword ||
        !pin ||
        !gender
      )
        return setError("Please fill out all required fields");

      if (password !== confirmPassword) return setError("Passwords do not match");
      if (pin.length !== 4) return setError("PIN must be exactly 4 digits");

      let verifiedAccountName = "";
      if (selectedBank && accountNumber) {
        verifiedAccountName = await verifyAccount();
        if (!verifiedAccountName) return;
      }

      setError(null);

      await signUp(email, password, {
        fullName,
        username,
        phoneNumber,
        gender,
        location: selectedState,
        pin,
        bankName: selectedBank?.name || null,
        accountNumber: accountNumber || null,
        accountName: verifiedAccountName || null,
      });

      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    }
  };

  /**
   * 🔹 Handle sign-in
   */
  const handleSignIn = async () => {
    try {
      setError(null);
      if (!email || !password) return setError("Provide both email and password");
      await signIn(email, password);
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    }
  };

  const filteredStates = NIGERIAN_STATES.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>{isSignUp ? "Create Account" : "Welcome Back"}</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {isSignUp ? (
            <>
              <TextInput label="Full Name" mode="outlined" style={styles.input} value={fullName} onChangeText={setFullName} />
              <TextInput label="Email" mode="outlined" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <TextInput label="Username" mode="outlined" style={styles.input} value={username} onChangeText={setUsername} />
              <TextInput label="Phone Number" mode="outlined" keyboardType="phone-pad" style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} />

              {/* --- Gender Dropdown --- */}
              <TouchableOpacity onPress={() => setGenderModal(true)} style={styles.dropdownAnchor}>
                <TextInput
                  label="Gender"
                  mode="outlined"
                  value={gender}
                  editable={false}
                  right={<TextInput.Icon icon="menu-down" />}
                />
              </TouchableOpacity>

              {/* Gender Modal */}
              <Modal visible={genderModal} animationType="slide" transparent onRequestClose={() => setGenderModal(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    {GENDER_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => {
                          setGender(option);
                          setGenderModal(false);
                        }}
                        style={styles.modalItem}
                      >
                        <Text>{option}</Text>
                      </TouchableOpacity>
                    ))}
                    <Button onPress={() => setGenderModal(false)}>Cancel</Button>
                  </View>
                </View>
              </Modal>

              {/* --- State Selector --- */}
              <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.dropdownAnchor}>
                <TextInput
                  label="Select State"
                  mode="outlined"
                  value={selectedState}
                  editable={false}
                  right={<TextInput.Icon icon="menu-down" />}
                />
              </TouchableOpacity>

              {/* State Modal */}
              <Modal visible={menuVisible} animationType="slide" transparent onRequestClose={() => setMenuVisible(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    <TextInput placeholder="Search state..." mode="outlined" value={search} onChangeText={setSearch} style={{ marginBottom: 10 }} />
                    <FlatList
                      data={filteredStates}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedState(item);
                            setMenuVisible(false);
                          }}
                          style={styles.modalItem}
                        >
                          <Text>{item}</Text>
                        </TouchableOpacity>
                      )}
                    />
                    <Button onPress={() => setMenuVisible(false)}>Cancel</Button>
                  </View>
                </View>
              </Modal>

              {/* --- Password and PIN --- */}
              <TextInput label="Password" mode="outlined" style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
              <TextInput label="Confirm Password" mode="outlined" style={styles.input} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
              <TextInput label="Create 4-Digit PIN" mode="outlined" style={styles.input} keyboardType="numeric" secureTextEntry maxLength={4} value={pin} onChangeText={setPin} />

              {/* --- Bank Section --- */}
              <Text style={{ marginVertical: 10, fontWeight: "bold" }}>Link Your Bank Account (Optional)</Text>

              <TouchableOpacity onPress={() => setBankModal(true)} style={styles.dropdownAnchor}>
                <TextInput
                  label="Select Bank"
                  mode="outlined"
                  value={selectedBank?.name || ""}
                  editable={false}
                  right={<TextInput.Icon icon="menu-down" />}
                />
              </TouchableOpacity>

              {/* Bank Modal */}
              <Modal visible={bankModal} transparent animationType="slide" onRequestClose={() => setBankModal(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    <FlatList
                      data={bankList}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedBank(item);
                            setBankModal(false);
                          }}
                          style={styles.modalItem}
                        >
                          <Text>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                    <Button onPress={() => setBankModal(false)}>Cancel</Button>
                  </View>
                </View>
              </Modal>

              <TextInput label="Account Number" mode="outlined" style={styles.input} keyboardType="numeric" maxLength={10} value={accountNumber} onChangeText={setAccountNumber} />
              {selectedBank && accountNumber ? (
                <Button mode="outlined" onPress={verifyAccount} loading={verifying} disabled={verifying} style={{ marginBottom: 10 }}>
                  Verify Account
                </Button>
              ) : null}

              <Button mode="contained" onPress={handleSignUp} style={styles.button}>
                Sign Up
              </Button>
            </>
          ) : (
            <>
              <TextInput label="Email" mode="outlined" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <TextInput label="Password" mode="outlined" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
              <Button mode="contained" onPress={handleSignIn} style={styles.button}>
                Sign In
              </Button>
            </>
          )}

          <View style={styles.toggleContainer}>
            <Text>{isSignUp ? "Already have an account?" : "Don't have an account?"}</Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.toggleButton}>{isSignUp ? "Sign In" : "Sign Up"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: Platform.OS === "ios" ? 60 : 40 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  content: { width: "100%" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#333", textAlign: "center" },
  errorText: { color: "red", marginBottom: 10, textAlign: "center" },
  input: { marginBottom: 16 },
  button: { marginTop: 8, backgroundColor: "#6200EE", paddingVertical: 5 },
  toggleContainer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  toggleButton: { color: "#6200EE", marginLeft: 5, fontWeight: "bold" },
  dropdownAnchor: { marginBottom: 16 },
  modalOverlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContainer: { backgroundColor: "#fff", margin: 20, borderRadius: 10, padding: 10, elevation: 5 },
  modalItem: { paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
});
