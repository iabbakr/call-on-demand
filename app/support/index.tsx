import { View, StyleSheet, Linking, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import { MaterialIcons, Feather } from "@expo/vector-icons";

const PRIMARY_COLOR = "#6200EE";

export default function Support() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Support</Text>

      <Pressable
        style={styles.option}
        onPress={() => Linking.openURL("tel:+2348001234567")}
      >
        <MaterialIcons name="call" size={24} color={PRIMARY_COLOR} />
        <Text style={styles.optionText}>Call Us</Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={() => Linking.openURL("mailto:support@example.com")}
      >
        <MaterialIcons name="email" size={24} color={PRIMARY_COLOR} />
        <Text style={styles.optionText}>Email Us</Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={() => router.push("/support/chat")}
      >
        <Feather name="message-square" size={24} color={PRIMARY_COLOR} />
        <Text style={styles.optionText}>In-App Chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 30,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  optionText: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: "500",
  },
});
