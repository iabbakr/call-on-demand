import { Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useApp } from "../../context/AppContext"; // ✅ import your context

const PRIMARY_COLOR = "#6200EE";

export default function Support() {
  const { userProfile } = useApp();
  const isAdmin = userProfile?.role === "admin";

  const handleChatPress = () => {
    if (isAdmin) {
      // ✅ Navigate to admin inbox
      router.push("/support/admin");
    } else {
      // ✅ Navigate to user chat
      router.push("/support/chat");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Support</Text>

      <Pressable
        style={styles.option}
        onPress={() => Linking.openURL("tel:+2348069728683")}
      >
        <MaterialIcons name="call" size={24} color={PRIMARY_COLOR} />
        <Text style={styles.optionText}>Call Us</Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={() => Linking.openURL("mailto:dangulbi01@gmail.com")}
      >
        <MaterialIcons name="email" size={24} color={PRIMARY_COLOR} />
        <Text style={styles.optionText}>Email Us</Text>
      </Pressable>

      <Pressable style={styles.option} onPress={handleChatPress}>
        <Feather name="message-square" size={24} color={PRIMARY_COLOR} />
        <Text style={styles.optionText}>
          {isAdmin ? "Admin Inbox" : "In-App Chat"}
        </Text>
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
