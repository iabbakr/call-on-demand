import CryptoJS from "crypto-js";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";

export function useSecureAction() {
  const { user } = useAuth();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // 🔐 Securely execute an action (biometric or PIN)
  const secureAction = async (action: () => void) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const savedBiometrics = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && supported.length > 0 && savedBiometrics) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Confirm with Biometrics",
          fallbackLabel: "Use PIN",
        });

        if (result.success) {
          action();
          return;
        }
      }

      // Fallback to PIN
      setPendingAction(() => action);
      setShowPinDialog(true);
    } catch (err) {
      console.log("Biometric Error:", err);
      setPendingAction(() => action);
      setShowPinDialog(true);
    }
  };

  // ✅ Verify PIN (with 3-attempt limit)
  const verifyPin = async (enteredPin: string) => {
    if (!user) return Alert.alert("Error", "User not authenticated.");

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return Alert.alert("Error", "User data not found.");

      const storedHashedPin = userDoc.data().pin;
      const enteredHashed = CryptoJS.SHA256(enteredPin).toString();

      if (enteredHashed === storedHashedPin) {
        // Success
        setShowPinDialog(false);
        setAttemptCount(0);
        if (pendingAction) pendingAction();
      } else {
        const newCount = attemptCount + 1;
        setAttemptCount(newCount);

        if (newCount >= 3) {
          setShowPinDialog(false);
          setAttemptCount(0);
          Alert.alert(
            "Too many incorrect attempts",
            "You’ve entered an incorrect PIN 3 times. Please update your PIN to continue.",
            [
              {
                text: "Update PIN",
                onPress: () => router.push("/profile/security"),
              },
            ]
          );
        } else {
          Alert.alert("Invalid PIN", `You have ${3 - newCount} attempts left.`);
        }
      }
    } catch (error) {
      console.error("PIN verify error:", error);
      Alert.alert("Error", "Could not verify PIN.");
    }
  };

  return { secureAction, showPinDialog, setShowPinDialog, verifyPin };
}
