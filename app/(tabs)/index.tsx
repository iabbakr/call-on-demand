import {
  Feather,
  FontAwesome5,
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
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
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";
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
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  const services = [
    { name: "Food", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1761212276/wewxrhop7oz1shofmz5f.jpg" },
    { name: "Logistics", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1761212276/uyednw5ub2bshlqnchqa.jpg" },
    { name: "Hotels", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1761212667/hjlpy1k6mzyk7bokf8wq.jpg" },
    { name: "Transport", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1761212274/x2p4l1xvbaock5hvrsby.jpg" },
    { name: "Education", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1761212275/fnpni2u0etl1tg6wy6l7.jpg" },
    { name: "Laundry", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1761212276/uyednw5ub2bshlqnchqa.jpg" },
    { name: "Loan", image: "https://res.cloudinary.com/dswwtuano/image/upload/v1761212273/hjk8womtfxoeuz2ly8t4.jpg" },
  ];

  // Fetch user data
  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) setUserData(snap.data() as UserData);
      } catch (err) {
        console.error("Error fetching user:", err);
        Alert.alert("Error", "Failed to fetch user info.");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  // Fetch transactions
  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      try {
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
          getDocs(sentQ),
          getDocs(recvQ),
        ]);

        const sentTx = sentSnap.docs.map((doc) => ({
          id: doc.id,
          direction: "sent",
          senderName: userData?.fullName || "You",
          receiverName: doc.data().receiverName || "Unknown",
          ...doc.data(),
        } as Transaction));

        const recvTx = recvSnap.docs.map((doc) => ({
          id: doc.id,
          direction: "received",
          senderName: doc.data().senderName || "Unknown",
          receiverName: userData?.fullName || "You",
          ...doc.data(),
        } as Transaction));

        const allTx = [...sentTx, ...recvTx].sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );

        setRecentTransactions(allTx.slice(0, 2));
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    };

    fetchTransactions();
  }, [user, userData]);

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % services.length;
      setCurrentIndex(nextIndex);
      scrollRef.current?.scrollTo({
        x: nextIndex * (130 + 12),
        animated: true,
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  const handleServicePress = (service: string) => {
    const servicePath = service.toLowerCase();
    switch (servicePath) {
      case "send":
      case "receive":
      case "withdraw":
      case "airtime":
      case "data":
      case "electricity":
      case "education":
      case "food":
      case "hotels":
      case "logistics":
      case "shop":
        router.push(`/services/${servicePath}`);
        break;
      default:
        Alert.alert(service, "This feature is coming soon!");
        break;
    }
  };

  return (
    <View style={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceCardInfo}>
          <Text style={styles.topBalanceCardInfo}>Available Balance</Text>
          <Pressable onPress={() => router.push("/profile/transaction-history")}>
            <Text style={styles.topBalanceCardInfo}>Transaction History {">>"}</Text>
          </Pressable>
        </View>

        <View style={styles.balanceCardInfo}>
          <Text style={styles.balance}>
            <FontAwesome5 name="coins" size={20} color={BACKGROUND_COLOR} />{" "}
            {userData?.balance?.toLocaleString() || "0"}
          </Text>
          <Pressable onPress={() => router.push("/wallet/add-funds")}>
            <Text style={styles.addMoney}>+ Add Coins</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Recent Transactions */}
        <View style={styles.transactionSection}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((txn) => (
              <Pressable
                key={txn.id}
                onPress={() =>
                  router.push({
                    pathname: "/components/trans/Transaction-Receipt",
                    params: { id: txn.id },
                  })
                }
              >
                <View style={styles.transactionCard}>
                  <Text style={styles.transactionLogo}>
                    {txn.direction === "sent" ? "📤" : "📥"}
                  </Text>
                  <View style={styles.transactionNameInfo}>
                    <Text style={styles.transactionName}>
                      {txn.direction === "sent" ? txn.receiverName : txn.senderName}
                    </Text>
                    <Text style={styles.transactionTime}>
                      {txn.createdAt
                        ? new Date(txn.createdAt.seconds * 1000).toLocaleString()
                        : "No date"}
                    </Text>
                  </View>
                  <View style={styles.transactionStatusInfo}>
                    <Text style={styles.transactionAmount}>
                      ₦{txn.amount?.toLocaleString() || "0.00"}
                    </Text>
                    <Text
                      style={[
                        styles.transactionStatus,
                        {
                          color:
                            txn.status === "Successful"
                              ? "green"
                              : txn.status === "Failed"
                              ? "red"
                              : "gray",
                        },
                      ]}
                    >
                      {txn.status || "Pending"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={{ textAlign: "center", marginTop: 10, color: "#555" }}>
              No transactions yet.
            </Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.bankCard}>
          {[
            { name: "Send", icon: <FontAwesome5 name="coins" size={24} color={PRIMARY_COLOR} /> },
            { name: "Receive", icon: <FontAwesome5 name="hand-holding-usd" size={24} color={PRIMARY_COLOR} /> },
            { name: "Withdraw", icon: <FontAwesome6 name="money-bills" size={24} color={PRIMARY_COLOR} /> },
          ].map((item, i) => (
            <View key={i} style={styles.util}>
              <Pressable onPress={() => handleServicePress(item.name)}>
                {item.icon}
                <Text style={styles.text}>{item.name}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Utilities */}
        <View style={styles.utilCard}>
          {[
            { name: "Airtime", icon: <MaterialIcons name="mobiledata-off" size={24} color={PRIMARY_COLOR} /> },
            { name: "Data", icon: <MaterialCommunityIcons name="cable-data" size={24} color={PRIMARY_COLOR} /> },
            { name: "Electricity", icon: <FontAwesome5 name="lightbulb" size={24} color={PRIMARY_COLOR} /> },
            { name: "Education", icon: <MaterialCommunityIcons name="book-education-outline" size={24} color={PRIMARY_COLOR} /> },
            { name: "Hotels", icon: <MaterialIcons name="hotel" size={24} color={PRIMARY_COLOR} /> },
            { name: "Shop", icon: <MaterialCommunityIcons name="car" size={24} color={PRIMARY_COLOR} /> },
            { name: "Food", icon: <MaterialCommunityIcons name="food-turkey" size={24} color={PRIMARY_COLOR} /> },
            { name: "Logistics", icon: <Feather name="package" size={24} color={PRIMARY_COLOR} /> },
          ].map((item, i) => (
            <View key={i} style={styles.util}>
              <Pressable onPress={() => handleServicePress(item.name)}>
                {item.icon}
                <Text style={styles.text}>{item.name}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Services Carousel */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: "bold", fontSize: 16, color: PRIMARY_COLOR, marginBottom: 8 }}>
            Our Services
          </Text>
          <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
            {services.map((service, i) => (
              <Pressable key={i} style={styles.serviceCard} onPress={() => handleServicePress(service.name)}>
                <Image source={{ uri: service.image }} style={styles.serviceImage} resizeMode="cover" />
                <View style={styles.serviceOverlay} />
                <Text style={styles.serviceNameOverlay}>{service.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: HEADER_BG },
  balanceCard: { backgroundColor: PRIMARY_COLOR, borderRadius: 8, padding: 16, marginBottom: 16, flexDirection: "column", gap: 15 },
  balanceCardInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  topBalanceCardInfo: { color: BACKGROUND_COLOR, fontSize: 11 },
  balance: { color: BACKGROUND_COLOR, fontSize: 20, fontWeight: "bold" },
  addMoney: { color: PRIMARY_COLOR, fontWeight: "bold", fontSize: 10, backgroundColor: BACKGROUND_COLOR, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 8 },
  bankCard: { backgroundColor: BACKGROUND_COLOR, borderRadius: 10, padding: 10, marginBottom: 16, flexDirection: "row", justifyContent: "space-around" },
  utilCard: { backgroundColor: BACKGROUND_COLOR, borderRadius: 10, height: "auto", padding: 10, marginBottom: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  util: { width: "23%", aspectRatio: 1, backgroundColor: HEADER_BG, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  transactionSection: { backgroundColor: BACKGROUND_COLOR, borderRadius: 10, padding: 10, marginBottom: 16 },
  transactionCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 5 },
  transactionLogo: { borderWidth: 1, borderColor: INACTIVE_COLOR, width: 40, height: 40, borderRadius: 20, textAlign: "center", textAlignVertical: "center" },
  transactionNameInfo: { flexDirection: "column", flex: 1, marginHorizontal: 10 },
  transactionName: { fontWeight: "bold", fontSize: 15, color: INACTIVE_COLOR },
  transactionTime: { fontSize: 12 },
  transactionStatusInfo: { flexDirection: "column", alignItems: "flex-end", justifyContent: "center" },
  transactionStatus: { color: PRIMARY_COLOR, backgroundColor: HEADER_BG, fontSize: 12, borderRadius: 2, paddingHorizontal: 2, paddingVertical: 2, marginRight: 8 },
  transactionAmount: { color: PRIMARY_COLOR, fontWeight: "bold", fontSize: 15 },
  text: { color: INACTIVE_COLOR, fontSize: 12, marginTop: 5, textAlign: "center" },
  serviceCard: { width: 120, height: 130, borderRadius: 12, marginRight: 12, overflow: "hidden", backgroundColor: HEADER_BG },
  serviceImage: { width: "100%", height: "100%" },
  serviceOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 30, backgroundColor: "rgba(0,0,0,0.4)" },
  serviceNameOverlay: { position: "absolute", bottom: 8, left: 8, right: 8, color: BACKGROUND_COLOR, fontSize: 14, fontWeight: "600", textAlign: "center" },
});
