import {
  FontAwesome5
} from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, Chip, Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const WARNING_COLOR = "#FF9800";
const { width } = Dimensions.get("window");

interface UserData {
  fullName: string;
  username: string;
  phoneNumber?: string;
  location?: string;
  balance?: number;
}

interface Transaction {
  id: string;
  senderId?: string;
  receiverId?: string;
  amount: number;
  type?: string;
  status: string;
  createdAt?: { seconds: number; nanoseconds: number };
  receiverName?: string;
  senderName?: string;
  direction?: "sent" | "received";
}

export default function Home() {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  const services = [
    { name: "Food", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1731212276/wewxrhop7oz1shofmz5f.jpg", icon: "🍲" },
    { name: "Logistics", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1731212276/uyednw5ub2bshlqnchqa.jpg", icon: "📦" },
    { name: "Hotels", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1731212667/hjlpy1k6mzyk7bokf8wq.jpg", icon: "🏨" },
    { name: "Transport", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1731212274/x2p4l1xvbaock5hvrsby.jpg", icon: "🚗" },
    { name: "Education", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1731212275/fnpni2u0etl1tg6wy6l7.jpg", icon: "📚" },
    { name: "Laundry", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1731212276/uyednw5ub2bshlqnchqa.jpg", icon: "👕" },
    { name: "Loan", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1731212273/hjk8womtfxoeuz2ly8t4.jpg", icon: "💰" },
  ];

  const quickActions = [
    { name: "Send", icon: "paper-plane", color: PRIMARY_COLOR, bg: ACCENT_COLOR },
    { name: "Receive", icon: "hand-holding-usd", color: SUCCESS_COLOR, bg: "#E8F5E9" },
    { name: "Withdraw", icon: "money-bill-wave", color: WARNING_COLOR, bg: "#FFF3E0" },
  ];

  const utilities = [
    { name: "Airtime", icon: "phone", color: "#2196F3" },
    { name: "Data", icon: "wifi", color: "#9C27B0" },
    { name: "Electricity", icon: "bolt", color: "#FF9800" },
    { name: "Education", icon: "graduation-cap", color: "#4CAF50" },
    { name: "Hotels", icon: "hotel", color: "#E91E63" },
    { name: "Shop", icon: "shopping-bag", color: "#FF5722" },
    { name: "Food", icon: "utensils", color: "#F44336" },
    { name: "Logistics", icon: "truck", color: "#795548" },
  ];

  const getUserName = async (uid?: string) => {
    if (!uid) return "Unknown";
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      return userSnap.exists() ? (userSnap.data() as any).fullName || "Unknown" : "Unknown";
    } catch (err) {
      console.error("Error fetching user name:", err);
      return "Unknown";
    }
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("User not found");

      const userDetails = snap.data() as UserData;
      setUserData(userDetails);

      const transRef = collection(db, "transactions");
      const sentQ = query(
        transRef,
        where("senderId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const recvQ = query(
        transRef,
        where("receiverId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const [sentSnap, recvSnap] = await Promise.all([
        getDocs(sentQ).catch(() => ({ docs: [] })),
        getDocs(recvQ).catch(() => ({ docs: [] })),
      ]);

      const sentTx = await Promise.all(
        sentSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            direction: "sent",
            senderName: userDetails.fullName || "You",
            receiverName: data.receiverName || (await getUserName(data.receiverId)),
            ...data,
          } as Transaction;
        })
      );

      const recvTx = await Promise.all(
        recvSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            direction: "received",
            senderName: data.senderName || (await getUserName(data.senderId)),
            receiverName: userDetails.fullName || "You",
            ...data,
          } as Transaction;
        })
      );

      const allTx = [...sentTx, ...recvTx].sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

      setRecentTransactions(allTx.slice(0, 2));
    } catch (err) {
      console.error("Error loading dashboard:", err);
      Alert.alert("Error", "Failed to load data.");
    }
  };

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };

    loadData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % services.length;
        scrollRef.current?.scrollTo({ x: next * (width * 0.7 + 16), animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [services.length]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const handleServicePress = (service: string) => {
    const path = service.toLowerCase();
    const allowed = [
      "send", "receive", "withdraw", "airtime", "data", "electricity",
      "education", "food", "hotels", "shop", "laundry", "logistics",
    ];
    if (allowed.includes(path)) {
      router.push(`/service/${path}`);
    } else {
      Alert.alert(service, "This feature is coming soon!");
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "successful" || s === "success") return SUCCESS_COLOR;
    if (s === "failed" || s === "error") return ERROR_COLOR;
    if (s === "pending") return WARNING_COLOR;
    return INACTIVE_COLOR;
  };

  const renderTransactionIcon = (txn: Transaction) => {
    const iconSize = 20;
    const type = txn.type?.toLowerCase() || "";
    
    if (type.includes("bill") || type.includes("utility") || type.includes("electricity")) {
      return <FontAwesome5 name="file-invoice" size={iconSize} color={PRIMARY_COLOR} />;
    }
    if (txn.direction === "sent") {
      return <FontAwesome5 name="arrow-up" size={iconSize} color={ERROR_COLOR} />;
    }
    if (txn.direction === "received") {
      return <FontAwesome5 name="arrow-down" size={iconSize} color={SUCCESS_COLOR} />;
    }
    return <FontAwesome5 name="exchange-alt" size={iconSize} color={INACTIVE_COLOR} />;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY_COLOR]}
          />
        }
      >
        

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Card.Content>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Pressable onPress={() => router.push("/profile/transaction-history")}>
                  
                <Text style={styles.historyChipText}>Transaction-History {">>"}</Text>
              </Pressable>
            </View>

            <View style={styles.balanceAmountRow}>
              <View style={styles.balanceAmountContainer}>
                <FontAwesome5 name="coins" size={24} color={BACKGROUND_COLOR} />
                <Text style={styles.balanceAmount}>
                  {userData?.balance?.toLocaleString() || "0"}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/wallet/add-funds")}
                style={styles.addMoneyButton}
              >
                <FontAwesome5 name="plus" size={14} color={PRIMARY_COLOR} />
                <Text style={styles.addMoneyText}>Add Funds</Text>
              </Pressable>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, i) => (
              <Pressable
                key={i}
                style={[styles.quickActionCard, { backgroundColor: action.bg }]}
                onPress={() => handleServicePress(action.name)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: BACKGROUND_COLOR }]}>
                  <FontAwesome5 name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionText}>{action.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {recentTransactions.length > 0 && (
              <Pressable onPress={() => router.push("/profile/transaction-history")}>
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            )}
          </View>

          {recentTransactions.length > 0 ? (
            <Card style={styles.transactionsCard}>
              <Card.Content>
                {recentTransactions.map((txn, index) => (
                  <Pressable
                    key={txn.id}
                    onPress={() =>
                      router.push({
                        pathname: "/components/trans/Transaction-Receipt",
                        params: { id: txn.id },
                      })
                    }
                  >
                    <View style={[
                      styles.transactionItem,
                      index !== recentTransactions.length - 1 && styles.transactionItemBorder
                    ]}>
                      <View style={[
                        styles.transactionIconContainer,
                        {
                          backgroundColor: txn.direction === "sent"
                            ? "#FFEBEE"
                            : txn.direction === "received"
                            ? "#E8F5E9"
                            : "#F5F5F5",
                        },
                      ]}>
                        {renderTransactionIcon(txn)}
                      </View>

                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionName} numberOfLines={1}>
                          {txn.direction === "sent" ? txn.receiverName : txn.senderName}
                        </Text>
                        <Text style={styles.transactionTime}>
                          {txn.createdAt
                            ? new Date(txn.createdAt.seconds * 1000).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "No date"}
                        </Text>
                      </View>

                      <View style={styles.transactionRight}>
                        <Text style={[
                          styles.transactionAmount,
                          { color: txn.direction === "sent" ? ERROR_COLOR : SUCCESS_COLOR }
                        ]}>
                          {txn.direction === "sent" ? "-" : "+"}₦{txn.amount?.toLocaleString() || "0"}
                        </Text>
                        <Chip
                          compact
                          style={[
                            styles.statusChip,
                            { backgroundColor: getStatusColor(txn.status) + "20" }
                          ]}
                          textStyle={[
                            styles.statusChipText,
                            { color: getStatusColor(txn.status) }
                          ]}
                        >
                          {txn.status || "Pending"}
                        </Chip>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <FontAwesome5 name="receipt" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                <Text style={styles.emptyText}>
                  Your recent transactions will appear here
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Utilities */}
        <View style={styles.utilitysSection}>
          <Text style={styles.sectionTitle}>Utilities & Bills</Text>
          <View style={styles.utilitiesGrid}>
            {utilities.map((util, i) => (
              <Pressable
                key={i}
                style={styles.utilityCard}
                onPress={() => handleServicePress(util.name)}
              >
                <View style={[styles.utilityIcon, { backgroundColor: util.color + "20" }]}>
                  <FontAwesome5 name={util.icon} size={24} color={util.color} />
                </View>
                <Text style={styles.utilityText}>{util.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Services Carousel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore Services</Text>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesScroll}
          >
            {services.map((service, i) => (
              <Pressable
                key={i}
                style={styles.serviceCard}
                onPress={() => handleServicePress(service.name)}
              >
                <Image
                  source={{ uri: service.image }}
                  style={styles.serviceImage}
                  resizeMode="cover"
                />
                <View style={styles.serviceGradient} />
                <View style={styles.serviceContent}>
                  <Text style={styles.serviceIcon}>{service.icon}</Text>
                  <Text style={styles.serviceName}>{service.name}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          
          {/* Carousel Dots */}
          <View style={styles.dotsContainer}>
            {services.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  currentIndex === i && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  greetingSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
  },
  greetingText: {
    fontSize: 14,
    color: "#666",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 4,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: PRIMARY_COLOR,
    elevation: 6,
    borderRadius: 16,
    marginTop: 10,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 13,
    color: BACKGROUND_COLOR,
  },
 
  historyChipText: {
    fontSize: 13,
    color: BACKGROUND_COLOR,
  },
  balanceAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: BACKGROUND_COLOR,
  },
  addMoneyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BACKGROUND_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addMoneyText: {
    color: PRIMARY_COLOR,
    fontWeight: "600",
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  transactionsCard: {
    elevation: 2,
    borderRadius: 12,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  transactionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  transactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: "#999",
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statusChip: {
    height: 30,
   
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyCard: {
    elevation: 2,
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  utilitysSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    elevation: 6,
    borderRadius: 16,

  },
  utilitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  utilityCard: {
    width: (width - 50) / 4,
    aspectRatio: 1,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  utilityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  utilityText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
  },
  servicesScroll: {
    paddingRight: 16,
  },
  serviceCard: {
    width: width * 0.7,
    height: 200,
    borderRadius: 16,
    marginRight: 16,
    overflow: "hidden",
    elevation: 4,
  },
  serviceImage: {
    width: "100%",
    height: "100%",
  },
  serviceGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  serviceContent: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  serviceIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: "bold",
    color: BACKGROUND_COLOR,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D0D0D0",
  },
  dotActive: {
    width: 24,
    backgroundColor: PRIMARY_COLOR,
  },
});