import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useApp } from "../../context/AppContext";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const INACTIVE_COLOR = "#757575";
const HEADER_BG = "#F5F5F5";

export default function Transactions() {
  const { transactions, loading } = useApp();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Transaction History</Text>

      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet.</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/components/trans/Transaction-Receipt",
                  params: { id: item.id },
                })
              }
              style={styles.transactionCard}
            >
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionType}>
                  {item.category || "Transaction"}
                </Text>
                <Text style={styles.transactionName}>
                  {item.description || "—"}
                </Text>
                <Text style={styles.transactionDate}>
                  {item.date
                    ? new Date(item.date).toLocaleString()
                    : "—"}
                </Text>
              </View>

              <View style={styles.transactionRight}>
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color:
                        item.type === "debit" ? "red" : PRIMARY_COLOR,
                    },
                  ]}
                >
                  {item.type === "debit" ? "-" : "+"}₦
                  {item.amount?.toLocaleString()}
                </Text>

                <Text
                  style={[
                    styles.transactionStatus,
                    {
                      color:
                        item.status.toLowerCase() === "success"
                          ? SECONDARY_COLOR
                          : "red",
                    },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HEADER_BG, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: BACKGROUND_COLOR,
    padding: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  transactionLeft: { flexDirection: "column" },
  transactionType: { fontSize: 15, fontWeight: "bold", color: INACTIVE_COLOR },
  transactionDate: { fontSize: 12, color: "#999" },
  transactionName: { fontSize: 13, color: "#333", fontWeight: "500" },
  transactionRight: { alignItems: "flex-end" },
  transactionAmount: { fontSize: 16, fontWeight: "bold" },
  transactionStatus: { fontSize: 12 },
  backButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  backButtonText: { color: BACKGROUND_COLOR, fontWeight: "bold" },
  emptyText: { color: INACTIVE_COLOR, textAlign: "center", marginTop: 30 },
});
