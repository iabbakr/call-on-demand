import {
  Feather,
  FontAwesome5,
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router"; // ✅ Added navigation
import { doc, getDoc } from "firebase/firestore";
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
const SECONDARY_COLOR = "#03DAC6";
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

export default function Home() {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const services = [
    { name: "Food", image: "https://images.unsplash.com/photo-1551218808-94e220e084d2" },
    { name: "Logistics", image: "https://images.unsplash.com/photo-1581090700227-1e37b190418e" },
    { name: "Hotels", image: "https://images.unsplash.com/photo-1551888419-7b7a520fe939" },
    { name: "Transport", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70" },
    { name: "Education", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b" },
  ];

  // Fetch user data from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setUserData(snap.data() as UserData);
        } else {
          console.log("No user data found");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        Alert.alert("Error", "Failed to fetch user info.");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  // Auto-scroll services
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % services.length;
      setCurrentIndex(nextIndex);
      scrollRef.current?.scrollTo({
        x: nextIndex * (130 + 12),
        animated: true,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  // ✅ Navigate to service pages
  const handleServicePress = (service: string) => {
    const servicePath = service.toLowerCase();

    switch (servicePath) {
      case "airtime":
        router.push("/services/airtime");
        break;
      case "data":
        router.push("/services/data");
        break;
      case "electricity":
        router.push("/services/electricity");
        break;
      case "education":
        router.push("/services/education");
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
          <Text style={styles.topBalanceCardInfo}>
            Welcome, {userData?.fullName?.split(" ")[0] || "User"}
          </Text>
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
        {/* Transaction Example */}
        <View style={styles.transactionSection}>
          <Pressable onPress={() => router.push("/profile/transaction-history")}>
            <View style={styles.transactionCard}>
              <Text style={styles.transactionLogo}>💰</Text>
              <View style={styles.transactionNameInfo}>
                <Text style={styles.transactionName}>Abubakar Ibrahim</Text>
                <Text style={styles.transactionTime}>Oct 12th, 10:48:06</Text>
              </View>
              <View style={styles.transactionStatusInfo}>
                <Text style={styles.transactionAmount}>+₦1,000.90</Text>
                <Text style={styles.transactionStatus}>Successful</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Utility Buttons */}
        <View style={styles.bankCard}>
          {[
            { name: "Send", icon: <FontAwesome5 name="coins" size={24} color={PRIMARY_COLOR} /> },
            { name: "Receive", icon: <FontAwesome5 name="coins" size={24} color={PRIMARY_COLOR} /> },
            { name: "Withdraw", icon: <FontAwesome6 name="money-bills" size={24} color={PRIMARY_COLOR} /> },
          ].map((item, i) => (
            <View key={i} style={styles.util}>
              <Pressable onPress={() => Alert.alert(item.name)}>
                {item.icon}
                <Text style={styles.text}>{item.name}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Services Grid */}
        <View style={styles.utilCard}>
          {[
            { name: "Airtime", icon: <MaterialIcons name="mobiledata-off" size={24} color={PRIMARY_COLOR} /> },
            { name: "Data", icon: <MaterialCommunityIcons name="cable-data" size={24} color={PRIMARY_COLOR} /> },
            { name: "Electricity", icon: <FontAwesome5 name="lightbulb" size={24} color={PRIMARY_COLOR} /> },
            { name: "Education", icon: <MaterialCommunityIcons name="book-education-outline" size={24} color={PRIMARY_COLOR} /> },
            { name: "Hotels", icon: <MaterialIcons name="hotel" size={24} color={PRIMARY_COLOR} /> },
            { name: "Transport", icon: <MaterialCommunityIcons name="car" size={24} color={PRIMARY_COLOR} /> },
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

        {/* Carousel */}
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

// Styles unchanged
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: HEADER_BG },
  balanceCard: { backgroundColor: PRIMARY_COLOR, borderRadius: 8, padding: 16, marginBottom: 16, flexDirection: "column", gap: 15 },
  balanceCardInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  topBalanceCardInfo: { color: BACKGROUND_COLOR, fontSize: 11 },
  balance: { color: BACKGROUND_COLOR, fontSize: 20, fontWeight: "bold" },
  addMoney: { color: PRIMARY_COLOR, fontWeight: "bold", fontSize: 10, backgroundColor: BACKGROUND_COLOR, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 8 },
  bankCard: { backgroundColor: BACKGROUND_COLOR, borderRadius: 10, padding: 10, marginBottom: 16, flexDirection: "row", justifyContent: "space-around" },
  utilCard: { backgroundColor: BACKGROUND_COLOR, borderRadius: 10, height: 165, padding: 10, marginBottom: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  util: { width: "23%", aspectRatio: 1, backgroundColor: HEADER_BG, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  transactionSection: { backgroundColor: BACKGROUND_COLOR, borderRadius: 10, padding: 10, marginBottom: 16 },
  transactionCard: { flexDirection: "row", justifyContent: "space-between" },
  transactionLogo: { borderWidth: 1, borderColor: INACTIVE_COLOR, width: 40, height: 40, borderRadius: 20, textAlign: "center", textAlignVertical: "center" },
  transactionNameInfo: { flexDirection: "column", gap: 5 },
  transactionName: { fontWeight: "bold", fontSize: 15, color: INACTIVE_COLOR },
  transactionTime: { fontSize: 12 },
  transactionStatusInfo: { flexDirection: "column", alignItems: "flex-end", justifyContent: "center" },
  transactionStatus: { color: PRIMARY_COLOR, backgroundColor: HEADER_BG, fontSize: 12, borderRadius: 2, paddingHorizontal: 2, paddingVertical: 2, marginRight: 18 },
  transactionAmount: { color: PRIMARY_COLOR, fontWeight: "bold", fontSize: 15 },
  text: { color: INACTIVE_COLOR },
  serviceCard: { width: 120, height: 130, borderRadius: 12, marginRight: 12, overflow: "hidden", backgroundColor: HEADER_BG },
  serviceImage: { width: "100%", height: "100%" },
  serviceOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 30, backgroundColor: "rgba(0,0,0,0.4)" },
  serviceNameOverlay: { position: "absolute", bottom: 8, left: 8, right: 8, color: BACKGROUND_COLOR, fontSize: 14, fontWeight: "600", textAlign: "center" },
});
