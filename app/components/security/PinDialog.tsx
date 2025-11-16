import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";

interface PinDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (enteredPin: string) => Promise<void> | void;
}

const PRIMARY_COLOR = "#6200EE";
const PRIMARY_DARK = "#5000CA";
const BACKGROUND_COLOR = "#FFFFFF";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_SECONDARY = "#6B7280";
const BORDER_COLOR = "#E5E7EB";
const CANCEL_BG = "#F3F4F6";
const CANCEL_PRESSED = "#E5E7EB";

export default function PinDialog({ visible, onClose, onSubmit }: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!pin || pin.length < 4) return;
    
    setIsLoading(true);
    try {
      await onSubmit(pin);
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPin("");
    onClose();
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="lock-outline" size={28} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.title}>Enter Your PIN</Text>
            <Text style={styles.subtitle}>
              Please enter your 4-digit PIN to continue
            </Text>
          </View>

          {/* PIN Input */}
          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              placeholder="Enter PIN"
              secureTextEntry
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              maxLength={6}
              style={styles.input}
              outlineColor={BORDER_COLOR}
              activeOutlineColor={PRIMARY_COLOR}
              textColor={TEXT_PRIMARY}
              placeholderTextColor={TEXT_SECONDARY}
              left={<TextInput.Icon icon="lock" color={TEXT_SECONDARY} />}
              autoFocus
              editable={!isLoading}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable 
              onPress={handleClose} 
              style={({ pressed }) => [
                styles.button, 
                styles.cancelButton,
                pressed && styles.cancelButtonPressed
              ]}
              disabled={isLoading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable 
              onPress={handleSubmit} 
              style={({ pressed }) => [
                styles.button, 
                styles.confirmButton,
                pressed && styles.confirmButtonPressed,
                (isLoading || !pin || pin.length < 4) && styles.confirmButtonDisabled
              ]}
              disabled={isLoading || !pin || pin.length < 4}
            >
              {isLoading ? (
                <Text style={styles.confirmText}>Processing...</Text>
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color={BACKGROUND_COLOR} />
                  <Text style={styles.confirmText}>Confirm</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F0FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: BACKGROUND_COLOR,
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
  },
  cancelButton: {
    backgroundColor: CANCEL_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cancelButtonPressed: {
    backgroundColor: CANCEL_PRESSED,
  },
  confirmButton: {
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonPressed: {
    backgroundColor: PRIMARY_DARK,
    transform: [{ scale: 0.98 }],
  },
  confirmButtonDisabled: {
    backgroundColor: "#BDBDBD",
    shadowOpacity: 0,
    elevation: 0,
  },
  cancelText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  confirmText: {
    color: BACKGROUND_COLOR,
    fontSize: 16,
    fontWeight: "700",
  },
});