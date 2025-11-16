// ============================================
// 1. SEND PAGE - send/index.tsx
// ============================================
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { Card, Chip, Text, TextInput } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";
import SecureActionWrapper from "../../components/security/SecureActionWrapper";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const SCREEN_BG = "#F5F5F5";

const { width } = Dimensions.get("window");

export default function SendPage() {
  const { user } = useAuth();
  const { balance, deductBalance, addTransaction } = useApp();
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundRecipient, setFoundRecipient] = useState<any>(null);

  const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

  // Find recipient
  const findRecipient = async (identifier: string) => {
    const usersRef = collection(db, "users");
    const cleaned = identifier.trim().replace(/^@/, "");

    const queries = [
      query(usersRef, where("username", "==", cleaned)),
      query(usersRef, where("email", "==", cleaned.toLowerCase())),
      query(usersRef, where("phoneNumber", "==", cleaned)),
    ];

    for (let q of queries) {
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0];
      }
    }
    return null;
  };

  const handleReceiverBlur = async () => {
    if (!receiver.trim()) return;
    
    try {
      const recipientDoc = await findRecipient(receiver);
      if (recipientDoc) {
        const data = recipientDoc.data();
        setFoundRecipient({
          uid: data.uid,
          fullName: data.fullName,
          username: data.username,
        });
      } else {
        setFoundRecipient(null);
      }
    } catch (error) {
      console.error("Error finding recipient:", error);
    }
  };

  const createTransaction = async (
    amt: number,
    recipientData: any,
    senderName: string
  ) => {
    try {
      const transactionData = {
        senderId: user?.uid,
        senderName: senderName,
        receiverId: recipientData.uid,
        receiverName: recipientData.fullName || recipientData.username,
        amount: amt,
        type: "Transfer",
        category: "Transfer",
        status: "success",
        description: `Sent to ${recipientData.username || receiver}`,
        reference: `SEND-${Date.now()}`,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "transactions"), transactionData);
      return docRef.id;
    } catch (error) {
      console.error("Error creating transaction:", error);
      return null;
    }
  };

  const performSend = async () => {
    if (!receiver.trim()) return Alert.alert("Invalid", "Enter receiver username, email, or phone.");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return Alert.alert("Invalid", "Enter a valid amount.");
    if (amt > balance) return Alert.alert("Insufficient", "You have insufficient balance.");

    try {
      setLoading(true);

      const recipientDoc = await findRecipient(receiver);
      if (!recipientDoc) {
        return Alert.alert("Error", "Recipient not found.");
      }

      const recipientData = recipientDoc.data();
      if (recipientData.uid === user?.uid) {
        return Alert.alert("Invalid", "You cannot send funds to yourself.");
      }

      const recipientId = recipientData.uid;
      const recipientRef = doc(db, "users", recipientId);

      // Get sender name
      const senderRef = doc(db, "users", user?.uid!);
      const senderSnap = await getDoc(senderRef);
      const senderName = senderSnap.exists() ? senderSnap.data()?.fullName || "You" : "You";

      // Deduct from sender
      await deductBalance(amt, `Sent to ${recipientData.username || receiver}`, "Transfer");

      // Add to receiver
      await updateDoc(recipientRef, {
        balance: increment(amt),
      });

      // Add transaction for receiver
      const receiverTxRef = collection(db, "users", recipientId, "transactions");
      await addDoc(receiverTxRef, {
        description: `Received ₦${amt} from ${senderName}`,
        amount: amt,
        category: "Transfer",
        type: "credit",
        status: "success",
        date: serverTimestamp(),
      });

      // Create global transaction
      const transactionId = await createTransaction(amt, recipientData, senderName);

      Alert.alert(
        "✅ Success",
        `₦${amt.toLocaleString()} sent to ${recipientData.fullName || recipientData.username}`,
        [
          {
            text: "View Receipt",
            onPress: () => {
              if (transactionId) {
                router.push({
                  pathname: "/components/trans/Transaction-Receipt",
                  params: { id: transactionId },
                });
              }
            },
          },
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]
      );

      setReceiver("");
      setAmount("");
      setFoundRecipient(null);
    } catch (err: any) {
      console.error("Send Error:", err);
      Alert.alert("Error", err?.message || "Failed to send funds");
    } finally {
      setLoading(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const canSend = receiver.trim() && numAmount > 0 && numAmount <= balance;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1 }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Send Money",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />
      
      <SecureActionWrapper>
        {(secureAction) => (
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Balance Card */}
            <Card style={styles.balanceCard}>
              <Card.Content>
                <View style={styles.balanceContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <View style={styles.balanceRow}>
                      <FontAwesome5 name="wallet" size={20} color="#FFF" />
                      <Text style={styles.balanceAmount}>₦{balance.toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={styles.sendIconContainer}>
                    <FontAwesome5 name="paper-plane" size={28} color="#FFF" />
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Receiver Input */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Recipient Details</Text>
                
                <TextInput
                  mode="outlined"
                  label="Username, Email or Phone"
                  placeholder="e.g. @abu, abu@gmail.com or 08012345678"
                  value={receiver}
                  onChangeText={(text) => {
                    setReceiver(text);
                    setFoundRecipient(null);
                  }}
                  onBlur={handleReceiverBlur}
                  style={styles.input}
                  left={<TextInput.Icon icon="account-search" />}
                  right={
                    foundRecipient ? (
                      <TextInput.Icon icon="check-circle" color={SUCCESS_COLOR} />
                    ) : null
                  }
                />

                {foundRecipient && (
                  <View style={styles.recipientCard}>
                    <FontAwesome5 name="user-circle" size={40} color={PRIMARY_COLOR} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipientName}>{foundRecipient.fullName}</Text>
                      <Text style={styles.recipientUsername}>@{foundRecipient.username}</Text>
                    </View>
                    <Chip compact style={styles.verifiedChip}>
                      <FontAwesome5 name="check" size={10} color={SUCCESS_COLOR} /> Verified
                    </Chip>
                  </View>
                )}
              </Card.Content>
            </Card>

            {/* Amount Input */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Amount to Send</Text>
                
                <TextInput
                  mode="outlined"
                  label="Amount"
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  style={styles.input}
                  left={<TextInput.Icon icon="currency-ngn" />}
                  right={
                    numAmount > 0 ? (
                      numAmount > balance ? (
                        <TextInput.Icon icon="alert-circle" color={ERROR_COLOR} />
                      ) : (
                        <TextInput.Icon icon="check-circle" color={SUCCESS_COLOR} />
                      )
                    ) : null
                  }
                />

                {numAmount > balance && (
                  <Text style={styles.errorText}>Insufficient balance</Text>
                )}

                {/* Quick Amounts */}
                <View style={styles.quickAmountsContainer}>
                  <Text style={styles.quickAmountsLabel}>Quick amounts:</Text>
                  <View style={styles.quickAmountsGrid}>
                    {quickAmounts.map((amt) => (
                      <Chip
                        key={amt}
                        selected={amount === amt.toString()}
                        onPress={() => setAmount(amt.toString())}
                        style={[
                          styles.quickChip,
                          amount === amt.toString() && styles.quickChipSelected,
                        ]}
                        textStyle={amount === amt.toString() && styles.quickChipTextSelected}
                      >
                        ₦{amt.toLocaleString()}
                      </Chip>
                    ))}
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Summary */}
            {canSend && foundRecipient && (
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <Text style={styles.summaryTitle}>Transaction Summary</Text>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Recipient:</Text>
                    <Text style={styles.summaryValue}>{foundRecipient.fullName}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount:</Text>
                    <Text style={styles.summaryValue}>₦{numAmount.toLocaleString()}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Balance After:</Text>
                    <Text style={[styles.summaryValue, { color: SUCCESS_COLOR }]}>
                      ₦{(balance - numAmount).toLocaleString()}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* Send Button */}
            <Pressable
              style={[styles.button, (!canSend || loading) && styles.buttonDisabled]}
              onPress={() => secureAction(performSend)}
              disabled={!canSend || loading}
            >
              {loading ? (
                <ActivityIndicator color={BACKGROUND_COLOR} />
              ) : (
                <View style={styles.buttonContent}>
                  <FontAwesome5 name="paper-plane" size={16} color={BACKGROUND_COLOR} />
                  <Text style={styles.buttonText}>Send ₦{numAmount.toLocaleString()}</Text>
                </View>
              )}
            </Pressable>

            {/* Info Card */}
            <Card style={styles.infoCard}>
              <Card.Content>
                <View style={styles.infoRow}>
                  <FontAwesome5 name="shield-alt" size={16} color={PRIMARY_COLOR} />
                  <Text style={styles.infoText}>Secured with PIN verification</Text>
                </View>
                <View style={styles.infoRow}>
                  <FontAwesome5 name="bolt" size={16} color={PRIMARY_COLOR} />
                  <Text style={styles.infoText}>Instant transfer</Text>
                </View>
                <View style={styles.infoRow}>
                  <FontAwesome5 name="receipt" size={16} color={PRIMARY_COLOR} />
                  <Text style={styles.infoText}>Transaction receipt available</Text>
                </View>
              </Card.Content>
            </Card>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SecureActionWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    padding: 16,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
  },
  balanceContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "500",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceAmount: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "bold",
  },
  sendIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Cards
  card: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  input: {
    backgroundColor: BACKGROUND_COLOR,
    marginBottom: 12,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },

  // Recipient Card
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: ACCENT_COLOR,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  recipientUsername: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  verifiedChip: {
    backgroundColor: SUCCESS_COLOR + "20",
    height: 24,
  },

  // Quick Amounts
  quickAmountsContainer: {
    marginTop: 4,
  },
  quickAmountsLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  quickAmountsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    backgroundColor: BACKGROUND_COLOR,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  quickChipSelected: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  quickChipTextSelected: {
    color: "#FFF",
  },

  // Summary
  summaryCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },

  // Button
  button: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: BACKGROUND_COLOR,
    fontWeight: "700",
    fontSize: 16,
  },

  // Info Card
  infoCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    elevation: 0,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
});