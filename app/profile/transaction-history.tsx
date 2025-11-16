import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Chip, Searchbar, Text } from "react-native-paper";
import { useApp } from "../../context/AppContext";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const WARNING_COLOR = "#FF9800";
const SCREEN_BG = "#F5F5F5";

const { width } = Dimensions.get("window");

export default function Transactions() {
  const router = useRouter();
  const { transactions, loading } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "debit" | "credit">("all");

  // Format date
  const formatDate = (date: any) => {
    if (!date) return "—";
    if (date.seconds) {
      const d = new Date(date.seconds * 1000);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return new Date(date).toLocaleDateString();
  };

  // Status color
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "success" || s === "successful") return SUCCESS_COLOR;
    if (s === "failed" || s === "error") return ERROR_COLOR;
    if (s === "pending") return WARNING_COLOR;
    return "#999";
  };

  // Filter and search
  const filteredTransactions = transactions.filter((item: any) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "debit" && item.type === "debit") ||
      (filter === "credit" && item.type === "credit");

    const matchesSearch =
      !search ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Get icon for transaction type
  const getTransactionIcon = (item: any) => {
    const type = item.type?.toLowerCase();
    const category = item.category?.toLowerCase();

    if (category?.includes("transfer")) {
      return type === "debit" ? "arrow-up" : "arrow-down";
    }
    if (category?.includes("airtime")) return "phone";
    if (category?.includes("data")) return "wifi";
    if (category?.includes("hotel")) return "hotel";
    if (category?.includes("laundry")) return "tshirt";
    if (category?.includes("withdrawal")) return "money-bill-wave";

    return type === "debit" ? "minus-circle" : "plus-circle";
  };

  const renderItem = ({ item }: { item: any }) => {
    const isDebit = item.type === "debit";
    const amountSign = isDebit ? "-" : "+";
    const icon = getTransactionIcon(item);

    return (
      <Pressable
        style={styles.transactionCard}
        onPress={() =>
          router.push({
            pathname: "/components/trans/Transaction-Receipt",
            params: { id: String(item.id) },
          })
        }
      >
        
        <View style={styles.transactionContent}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDebit ? ERROR_COLOR + "20" : SUCCESS_COLOR + "20",
              },
            ]}
          >
            <FontAwesome5
              name={icon}
              size={20}
              color={isDebit ? ERROR_COLOR : SUCCESS_COLOR}
            />
          </View>

          <View style={styles.transactionDetails}>
            <Text style={styles.transactionCategory} numberOfLines={1}>
              {item.category || "Transaction"}
            </Text>
            <Text style={styles.transactionDescription} numberOfLines={1}>
              {item.description || "—"}
            </Text>
            <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
          </View>

          <View style={styles.transactionRight}>
            <Text
              style={[
                styles.transactionAmount,
                { color: isDebit ? ERROR_COLOR : SUCCESS_COLOR },
              ]}
            >
              {amountSign}₦{item.amount?.toLocaleString() || "0"}
            </Text>

            <Chip
              compact
              style={[
                styles.statusChip,
                { backgroundColor: getStatusColor(item.status) + "20" },
              ]}
              textStyle={[
                styles.statusChipText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status || "Pending"}
            </Chip>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Transaction History",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerLeft: () => {
            return (
              <Pressable onPress={() => router.back()} >
                <MaterialIcons name="arrow-back" size={24} color="#fff" style={{ paddingLeft: 5 }} />
              </Pressable>
            );
          },
          headerRight: () => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>


    {/* New Download button */}
    <Pressable 
      onPress={() => router.push("/profile/download-statement")}
      style={{ paddingLeft: 8 }}
    >
      <FontAwesome5 name="download" size={20} color="#fff" />
    </Pressable>
  </View>
)
        }}
      />
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.header}>Transaction</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{transactions.length}</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          View all your transactions and receipts
        </Text>
      </View>

      {/* Search */}
      <Searchbar
        placeholder="Search transactions..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchBar}
        iconColor={PRIMARY_COLOR}
      />

      {/* Filters */}
      <View style={styles.filterContainer}>
        <Chip
          selected={filter === "all"}
          onPress={() => setFilter("all")}
          style={[styles.filterChip, filter === "all" && styles.filterChipActive]}
          textStyle={filter === "all" && styles.filterChipTextActive}
        >
          All
        </Chip>
        <Chip
          selected={filter === "debit"}
          onPress={() => setFilter("debit")}
          style={[
            styles.filterChip,
            filter === "debit" && styles.filterChipActive,
          ]}
          textStyle={filter === "debit" && styles.filterChipTextActive}
        >
          <FontAwesome5 name="arrow-up" size={10} /> Sent
        </Chip>
        <Chip
          selected={filter === "credit"}
          onPress={() => setFilter("credit")}
          style={[
            styles.filterChip,
            filter === "credit" && styles.filterChipActive,
          ]}
          textStyle={filter === "credit" && styles.filterChipTextActive}
        >
          <FontAwesome5 name="arrow-down" size={10} /> Received
        </Chip>
      </View>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="receipt" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Transactions Found</Text>
          <Text style={styles.emptyText}>
            {search || filter !== "all"
              ? "Try adjusting your filters"
              : "Your transactions will appear here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SCREEN_BG,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },

  // Header
  headerContainer: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },

  // Search
  searchBar: {
    marginHorizontal: 16,
    marginTop: -12,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
  },

  // Filters
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: BACKGROUND_COLOR,
  },
  filterChipActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  filterChipTextActive: {
    color: "#FFF",
  },

  // Transaction Card
  transactionCard: {
    backgroundColor: BACKGROUND_COLOR,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 11,
    color: "#999",
  },
  transactionRight: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  statusChip: {
  paddingHorizontal: 1,
  paddingVertical: 1, // gives space for text
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
},
statusChipText: {
  fontSize: 10,
  fontWeight: "600",
  lineHeight: 12, // make sure text fits
},

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },

  // List
  listContent: {
    paddingBottom: 80,
  },
});