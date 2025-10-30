import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";

interface PinDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (enteredPin: string) => Promise<void> | void;
}

export default function PinDialog({ visible, onClose, onSubmit }: PinDialogProps) {
  const [pin, setPin] = useState("");

  const handleSubmit = async () => {
    await onSubmit(pin);
    setPin("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Enter PIN</Text>
          <TextInput
            mode="outlined"
            placeholder="****"
            secureTextEntry
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            style={styles.input}
          />
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.button, styles.cancel]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSubmit} style={[styles.button, styles.confirm]}>
              <Text style={styles.confirmText}>Confirm</Text>
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
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 6,
  },
  cancel: {
    backgroundColor: "#eee",
    marginRight: 8,
  },
  confirm: {
    backgroundColor: "#6200EE",
  },
  cancelText: {
    color: "#000",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "600",
  },
});
