import { getStates } from "@/constants/data/nigeriaData";
import { icons } from "@/constants/icons";
import axios from "axios";
import { router } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
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
import { db } from "../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";

const GENDER_OPTIONS = ["Male", "Female", "Other"];

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [referral, setReferral] = useState("");
  const [bankList, setBankList] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [nameVerified, setNameVerified] = useState(false);
  
  // Modals
  const [genderModal, setGenderModal] = useState(false);
  const [stateModal, setStateModal] = useState(false);
  const [bankModal, setBankModal] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  const NIGERIAN_STATES = getStates();

  // 🔹 Fetch Paystack Banks
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

  // 🔹 Name Matching Logic - Check if at least 2 names match
  const verifyNameMatch = (userFullName: string, paystackName: string): boolean => {
    // Normalize names: lowercase, remove extra spaces, split into words
    const normalizeNames = (name: string): string[] => {
      return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .split(" ")
        .filter((word) => word.length > 1); // Filter out single letters/initials
    };

    const userNames = normalizeNames(userFullName);
    const paystackNames = normalizeNames(paystackName);

    // Count how many names match
    let matchCount = 0;
    for (const userName of userNames) {
      if (paystackNames.includes(userName)) {
        matchCount++;
      }
    }

    // At least 2 names must match
    return matchCount >= 2;
  };

  // ✅ Verify Bank Account
  const verifyAccount = async () => {
    if (!selectedBank || !accountNumber) return null;
    try {
      setVerifying(true);
      setNameVerified(false);
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

      // Check if names match
      const namesMatch = verifyNameMatch(fullName, account_name);
      setNameVerified(namesMatch);

      if (!namesMatch) {
        Alert.alert(
          "❌ Name Verification Failed",
          `Your full name (${fullName}) does not match the account name (${account_name}).\n\nAt least 2 names must match for verification.`,
          [{ text: "OK" }]
        );
        return null;
      }

      Alert.alert(
        "✅ Account Verified",
        `Account Name: ${account_name}\n\nName verification successful!`
      );
      return account_name;
    } catch (err: any) {
      Alert.alert(
        "❌ Verification failed",
        err.response?.data?.message || "Could not verify account"
      );
      return null;
    } finally {
      setVerifying(false);
    }
  };

  // 🔍 Check for duplicates in Firestore
  const checkIfUserExists = async () => {
    const usersRef = collection(db, "users");

    const [emailSnap, usernameSnap, phoneSnap, accountSnap] = await Promise.all([
      getDocs(query(usersRef, where("email", "==", email))),
      getDocs(query(usersRef, where("username", "==", username))),
      getDocs(query(usersRef, where("phoneNumber", "==", phoneNumber))),
      accountNumber
        ? getDocs(query(usersRef, where("accountNumber", "==", accountNumber)))
        : Promise.resolve({ empty: true }),
    ]);

    if (!emailSnap.empty) throw new Error("Email is already registered");
    if (!usernameSnap.empty) throw new Error("Username is already taken");
    if (!phoneSnap.empty) throw new Error("Phone number is already in use");
    if (!accountSnap.empty)
      throw new Error("Account number is already linked to another user");
  };

  // 🟣 Handle Sign Up - Step 1
  const handleStep1 = () => {
    setError(null);
    if (!fullName || !username || !phoneNumber || !gender || !selectedState) {
      return setError("Please fill all required fields");
    }

    // Validate full name has at least 2 words
    const names = fullName.trim().split(/\s+/);
    if (names.length < 2) {
      return setError("Full name must contain at least 2 names (First name and Last name)");
    }

    setCurrentStep(2);
  };

  // 🟣 Handle Sign Up - Step 2 (Final)
  const handleSignUp = async () => {
    try {
      setError(null);

      if (!email || !password || !confirmPassword || !pin) {
        return setError("Please fill out all required fields");
      }

      if (password !== confirmPassword) return setError("Passwords do not match");
      if (pin.length !== 4) return setError("PIN must be exactly 4 digits");

      // 🔹 Check if bank account is linked and verified
      if (selectedBank && accountNumber) {
        if (!accountName) {
          return setError("Please verify your bank account before proceeding");
        }
        if (!nameVerified) {
          return setError(
            "Name verification failed. At least 2 names from your full name must match the account name"
          );
        }
      } else {
        // Bank linking is required for authentication
        return setError(
          "Bank account verification is required. Please link and verify your bank account to proceed."
        );
      }

      // 🔹 Check for duplicates in Firestore
      await checkIfUserExists();

      await signUp(email, password, {
        fullName,
        username,
        phoneNumber,
        gender,
        location: selectedState,
        pin,
        referral: referral || null,
        bankName: selectedBank?.name || null,
        accountNumber: accountNumber || null,
        accountName: accountName || null,
        nameVerified: true,
      });

      Alert.alert("✅ Success", "Your account has been created successfully!");
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    }
  };

  // 🟣 Handle Sign In
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

  const filteredStates = Array.from(NIGERIAN_STATES).filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Image 
                source={icons.logo}
                style={{ width: 88, height: 88, borderRadius: 16 }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isSignUp ? "Create Your Account" : "Welcome Back"}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? "Join us and get started in minutes"
              : "Sign in to continue to your account"}
          </Text>

          {/* Progress Indicator for Sign Up */}
          {isSignUp && (
            <View style={styles.progressContainer}>
              <View style={styles.progressSteps}>
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressCircle,
                      currentStep >= 1 && styles.progressCircleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressCircleText,
                        currentStep >= 1 && styles.progressCircleTextActive,
                      ]}
                    >
                      {currentStep > 1 ? "✓" : "1"}
                    </Text>
                  </View>
                  <Text style={styles.progressLabel}>Personal Info</Text>
                </View>
                <View style={styles.progressLine} />
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressCircle,
                      currentStep >= 2 && styles.progressCircleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressCircleText,
                        currentStep >= 2 && styles.progressCircleTextActive,
                      ]}
                    >
                      2
                    </Text>
                  </View>
                  <Text style={styles.progressLabel}>Security & Verification</Text>
                </View>
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form Content */}
          <View style={styles.formContent}>
            {isSignUp ? (
              <>
                {currentStep === 1 ? (
                  <>
                    {/* Step 1: Personal Information */}
                    <TextInput
                      label="Full Name (First & Last Name) *"
                      mode="outlined"
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      outlineColor={ACCENT_COLOR}
                      activeOutlineColor={PRIMARY_COLOR}
                      placeholder="e.g., John Doe"
                    />

                    <View style={styles.row}>
                      <TextInput
                        label="Username *"
                        mode="outlined"
                        style={[styles.input, styles.halfInput]}
                        value={username}
                        onChangeText={setUsername}
                        outlineColor={ACCENT_COLOR}
                        activeOutlineColor={PRIMARY_COLOR}
                      />
                      <TextInput
                        label="Phone Number *"
                        mode="outlined"
                        keyboardType="phone-pad"
                        style={[styles.input, styles.halfInput]}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        outlineColor={ACCENT_COLOR}
                        activeOutlineColor={PRIMARY_COLOR}
                      />
                    </View>

                    <View style={styles.row}>
                      <TouchableOpacity
                        onPress={() => setGenderModal(true)}
                        style={[styles.dropdownAnchor, styles.halfInput]}
                      >
                        <TextInput
                          label="Gender *"
                          mode="outlined"
                          value={gender}
                          editable={false}
                          right={<TextInput.Icon icon="menu-down" />}
                          outlineColor={ACCENT_COLOR}
                          activeOutlineColor={PRIMARY_COLOR}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setStateModal(true)}
                        style={[styles.dropdownAnchor, styles.halfInput]}
                      >
                        <TextInput
                          label="State *"
                          mode="outlined"
                          value={selectedState}
                          editable={false}
                          right={<TextInput.Icon icon="menu-down" />}
                          outlineColor={ACCENT_COLOR}
                          activeOutlineColor={PRIMARY_COLOR}
                        />
                      </TouchableOpacity>
                    </View>

                    <Button
                      mode="contained"
                      onPress={handleStep1}
                      style={styles.button}
                      labelStyle={styles.buttonLabel}
                    >
                      Continue →
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Step 2: Security & Bank */}
                    <TextInput
                      label="Email Address *"
                      mode="outlined"
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      outlineColor={ACCENT_COLOR}
                      activeOutlineColor={PRIMARY_COLOR}
                    />

                    <TextInput
                      label="Password *"
                      mode="outlined"
                      style={styles.input}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      right={
                        <TextInput.Icon
                          icon={showPassword ? "eye-off" : "eye"}
                          onPress={() => setShowPassword(!showPassword)}
                        />
                      }
                      outlineColor={ACCENT_COLOR}
                      activeOutlineColor={PRIMARY_COLOR}
                    />

                    <TextInput
                      label="Confirm Password *"
                      mode="outlined"
                      style={styles.input}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      right={
                        <TextInput.Icon
                          icon={showConfirmPassword ? "eye-off" : "eye"}
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        />
                      }
                      outlineColor={ACCENT_COLOR}
                      activeOutlineColor={PRIMARY_COLOR}
                    />

                    <TextInput
                      label="4-Digit Security PIN *"
                      mode="outlined"
                      style={styles.input}
                      keyboardType="numeric"
                      secureTextEntry={!showPin}
                      maxLength={4}
                      value={pin}
                      onChangeText={setPin}
                      right={
                        <TextInput.Icon
                          icon={showPin ? "eye-off" : "eye"}
                          onPress={() => setShowPin(!showPin)}
                        />
                      }
                      outlineColor={ACCENT_COLOR}
                      activeOutlineColor={PRIMARY_COLOR}
                    />

                    <TextInput
                      label="Referral Code (Optional)"
                      mode="outlined"
                      style={styles.input}
                      value={referral}
                      onChangeText={setReferral}
                      outlineColor={ACCENT_COLOR}
                      activeOutlineColor={PRIMARY_COLOR}
                    />

                    {/* Bank Linking Section - REQUIRED */}
                    <View style={styles.bankSection}>
                      <Text style={styles.sectionTitle}>💳 Bank Account Verification *</Text>
                      <Text style={styles.sectionSubtitle}>
                        Required - Your name must match your bank account name
                      </Text>

                      <TouchableOpacity
                        onPress={() => setBankModal(true)}
                        style={styles.dropdownAnchor}
                      >
                        <TextInput
                          label="Select Bank *"
                          mode="outlined"
                          value={selectedBank?.name || ""}
                          editable={false}
                          right={<TextInput.Icon icon="menu-down" />}
                          outlineColor={ACCENT_COLOR}
                          activeOutlineColor={PRIMARY_COLOR}
                        />
                      </TouchableOpacity>

                      {selectedBank && (
                        <>
                          <TextInput
                            label="Account Number *"
                            mode="outlined"
                            style={styles.input}
                            keyboardType="numeric"
                            maxLength={10}
                            value={accountNumber}
                            onChangeText={(text) => {
                              setAccountNumber(text);
                              // Reset verification when account number changes
                              if (text.length !== 10) {
                                setAccountName("");
                                setNameVerified(false);
                              }
                            }}
                            outlineColor={ACCENT_COLOR}
                            activeOutlineColor={PRIMARY_COLOR}
                          />

                          {accountNumber.length === 10 && !accountName && (
                            <Button
                              mode="outlined"
                              onPress={verifyAccount}
                              loading={verifying}
                              disabled={verifying}
                              style={styles.verifyButton}
                            >
                              🔍 Verify Account
                            </Button>
                          )}

                          {accountName && (
                            <View
                              style={[
                                styles.verifiedBanner,
                                !nameVerified && styles.failedBanner,
                              ]}
                            >
                              <View
                                style={[
                                  styles.verifiedIcon,
                                  !nameVerified && styles.failedIcon,
                                ]}
                              >
                                <Text style={styles.verifiedIconText}>
                                  {nameVerified ? "✓" : "✕"}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.verifiedLabel}>Account Name</Text>
                                <Text
                                  style={[
                                    styles.verifiedName,
                                    !nameVerified && styles.failedName,
                                  ]}
                                >
                                  {accountName}
                                </Text>
                                {nameVerified ? (
                                  <Text style={styles.verifiedMatch}>
                                    ✓ Name verified successfully
                                  </Text>
                                ) : (
                                  <Text style={styles.failedMatch}>
                                    ✕ At least 2 names must match
                                  </Text>
                                )}
                              </View>
                            </View>
                          )}
                        </>
                      )}

                      {!selectedBank && (
                        <View style={styles.infoBox}>
                          <Text style={styles.infoIcon}>ℹ️</Text>
                          <Text style={styles.infoText}>
                            Bank verification is required. At least 2 names from your full name must
                            match your bank account name.
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.buttonGroup}>
                      <Button
                        mode="outlined"
                        onPress={() => setCurrentStep(1)}
                        style={styles.backButton}
                      >
                        ← Back
                      </Button>
                      <Button
                        mode="contained"
                        onPress={handleSignUp}
                        style={styles.button}
                        labelStyle={styles.buttonLabel}
                        disabled={selectedBank && accountNumber && !nameVerified}
                      >
                        Create Account
                      </Button>
                    </View>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Sign In Form */}
                <TextInput
                  label="Email Address"
                  mode="outlined"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  outlineColor={ACCENT_COLOR}
                  activeOutlineColor={PRIMARY_COLOR}
                />

                <TextInput
                  label="Password"
                  mode="outlined"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  outlineColor={ACCENT_COLOR}
                  activeOutlineColor={PRIMARY_COLOR}
                />

                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </TouchableOpacity>

                <Button
                  mode="contained"
                  onPress={handleSignIn}
                  style={styles.button}
                  labelStyle={styles.buttonLabel}
                >
                  Sign In
                </Button>
              </>
            )}
          </View>

          {/* Toggle Sign In/Sign Up */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setCurrentStep(1);
                setError(null);
              }}
            >
              <Text style={styles.toggleButton}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Gender Modal */}
      <Modal
        visible={genderModal}
        animationType="slide"
        transparent
        onRequestClose={() => setGenderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  setGender(option);
                  setGenderModal(false);
                }}
                style={styles.modalItem}
              >
                <Text style={styles.modalItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
            <Button onPress={() => setGenderModal(false)} style={styles.modalCancel}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      {/* State Modal */}
      <Modal
        visible={stateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setStateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select State</Text>
            <TextInput
              placeholder="Search states..."
              mode="outlined"
              value={stateSearch}
              onChangeText={setStateSearch}
              style={styles.modalSearch}
              outlineColor={ACCENT_COLOR}
              activeOutlineColor={PRIMARY_COLOR}
            />
            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedState(item);
                    setStateModal(false);
                    setStateSearch("");
                  }}
                  style={styles.modalItem}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            <Button onPress={() => setStateModal(false)} style={styles.modalCancel}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      {/* Bank Modal */}
      <Modal
        visible={bankModal}
        transparent
        animationType="slide"
        onRequestClose={() => setBankModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Bank</Text>
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
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            <Button onPress={() => setBankModal(false)} style={styles.modalCancel}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  content: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: ACCENT_COLOR,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1B1F",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: INACTIVE_COLOR,
    textAlign: "center",
    marginBottom: 24,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressSteps: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  progressStep: {
    alignItems: "center",
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  progressCircleActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  progressCircleText: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_COLOR,
  },
  progressCircleTextActive: {
    color: BACKGROUND_COLOR,
  },
  progressLabel: {
    fontSize: 12,
    color: INACTIVE_COLOR,
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: ACCENT_COLOR,
    marginHorizontal: 8,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: `${ERROR_COLOR}15`,
    borderWidth: 1,
    borderColor: `${ERROR_COLOR}40`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  errorText: {
    flex: 1,
    color: ERROR_COLOR,
    fontSize: 14,
  },
  formContent: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: BACKGROUND_COLOR,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  dropdownAnchor: {
    marginBottom: 16,
  },
  forgotPassword: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  forgotLink: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: "500",
  },
  bankSection: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1B1F",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: INACTIVE_COLOR,
    marginBottom: 16,
  },
  verifyButton: {
    marginTop: 8,
    marginBottom: 12,
    borderColor: PRIMARY_COLOR,
  },
  verifiedBanner: {
    backgroundColor: `${SUCCESS_COLOR}15`,
    borderWidth: 1,
    borderColor: `${SUCCESS_COLOR}40`,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  failedBanner: {
    backgroundColor: `${ERROR_COLOR}15`,
    borderColor: `${ERROR_COLOR}40`,
  },
  verifiedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SUCCESS_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  failedIcon: {
    backgroundColor: ERROR_COLOR,
  },
  verifiedIconText: {
    color: BACKGROUND_COLOR,
    fontSize: 18,
    fontWeight: "700",
  },
  verifiedLabel: {
    fontSize: 12,
    color: INACTIVE_COLOR,
    marginBottom: 4,
  },
  verifiedName: {
    fontSize: 15,
    fontWeight: "600",
    color: SUCCESS_COLOR,
    marginBottom: 4,
  },
  failedName: {
    color: ERROR_COLOR,
  },
  verifiedMatch: {
    fontSize: 12,
    color: SUCCESS_COLOR,
    fontWeight: "500",
  },
  failedMatch: {
    fontSize: 12,
    color: ERROR_COLOR,
    fontWeight: "500",
  },
  infoBox: {
    backgroundColor: `${PRIMARY_COLOR}10`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}30`,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#49454F",
    lineHeight: 18,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 8,
  },
  backButton: {
    flex: 1,
    borderColor: ACCENT_COLOR,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: ACCENT_COLOR,
  },
  footerText: {
    fontSize: 14,
    color: INACTIVE_COLOR,
    marginRight: 6,
  },
  toggleButton: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1B1F",
    marginBottom: 16,
  },
  modalSearch: {
    marginBottom: 16,
    backgroundColor: BACKGROUND_COLOR,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: ACCENT_COLOR,
  },
  modalItemText: {
    fontSize: 15,
    color: "#1C1B1F",
  },
  modalCancel: {
    marginTop: 16,
  },
});