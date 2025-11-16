import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showHistory?: boolean;
}

export default function Header({ title, showBack = true, showHistory = false }: HeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {showBack ? (
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
      ) : <View style={styles.iconPlaceholder} />}

      <View style={styles.titleContainer}>
        <FontAwesome5 name="money-bill" size={0} /> {/* optional icon placeholder if needed */}
      </View>

      {showHistory ? (
        <Pressable
          onPress={() => router.push("/profile/transaction-history")}
          style={styles.iconButton}
        >
          <FontAwesome5 name="history" size={20} color="#fff" />
        </Pressable>
      ) : <View style={styles.iconPlaceholder} />}
    </View>
  );
}

const PRIMARY_COLOR = "#6200EE";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 12,
    height: 56,
  },
  iconButton: {
    padding: 4,
  },
  iconPlaceholder: {
    width: 28, // match icon width
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
