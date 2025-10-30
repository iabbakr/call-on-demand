import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

const PRIMARY_COLOR = "#6200EE";

export default function SecuritySettings() {
  const router = useRouter();

  const options = [
    { label: "Change Password", icon: "lock", route: "/profile/security/change-password" },
    { label: "Change Transaction PIN", icon: "key", route: "/profile/security/change-pin" },
    { label: "Change Email", icon: "mail", route: "/profile/security/change-email" },
    { label: "Change Mobile Number", icon: "phone", route: "/profile/security/change-mobile" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Security Settings</Text>

      {options.map((item, index) => (
        <Pressable
          key={index}
          style={styles.option}
          onPress={() => router.push(item.route as any)}
        >
          <Feather name={item.icon as any} size={22} color={PRIMARY_COLOR} />
          <Text style={styles.optionText}>{item.label}</Text>
          <MaterialIcons
            name="arrow-forward-ios"
            size={18}
            color="#999"
            style={{ marginLeft: "auto" }}
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 30,
    textAlign: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 16,
    color: "#333",
  },
});
