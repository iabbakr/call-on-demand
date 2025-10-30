import { handleDailyCheckIn, redeemBonus, subscribeToUserBonus } from "@/lib/rewards";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

export default function Rewards() {
  const [bonusBalance, setBonusBalance] = useState(0);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    const loadCheckInStatus = async () => {
      const lastCheckIn = await AsyncStorage.getItem("lastCheckIn");
      if (lastCheckIn && Date.now() - parseInt(lastCheckIn) < 24 * 60 * 60 * 1000) {
        setCheckedIn(true);
      }
    };
    loadCheckInStatus();

    const unsub = subscribeToUserBonus(setBonusBalance);
    return () => unsub && unsub();
  }, []);

  const handleCheckIn = async () => {
    if (checkedIn) return Alert.alert("⏳ Come back tomorrow!", "You can only check in once per day.");
    await handleDailyCheckIn();
    await AsyncStorage.setItem("lastCheckIn", Date.now().toString());
    setCheckedIn(true);
    Alert.alert("✅ Check-In Successful!", "You earned 10 bonus coins!");
  };

  const handleRedeem = async () => {
    await redeemBonus();
    Alert.alert("🎉 Redeemed!", "Your bonus has been added to your balance.");
  };

  const rewards = [
    {
      title: "Daily Check-In",
      points: "+10 Coins/day",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3",
      onPress: handleCheckIn,
      disabled: checkedIn,
    },
    {
      title: "Refer a Friend",
      points: "+100 Coins",
      image: "https://images.unsplash.com/photo-1544717305-2782549b5136",
      onPress: () => Alert.alert("Refer a Friend", "Share your referral link!"),
    },
    {
      title: "Complete Profile",
      points: "+100 Coins",
      image: "https://images.unsplash.com/photo-1515165562835-c3b8f63c2dca",
      onPress: () => router.push("/profile/CompleteProfile"),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      <Text style={styles.headerTitle}>Rewards & Services</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceText}>Your Total Reward Coins</Text>
        <Text style={styles.balanceValue}>
          <FontAwesome5 name="coins" size={18} color={BACKGROUND_COLOR} /> {bonusBalance}
        </Text>
        <Pressable onPress={handleRedeem} style={styles.redeemButton}>
          <Text style={styles.redeemText}>Redeem Now</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Available Rewards</Text>
      <View style={styles.rewardsGrid}>
        {rewards.map((reward, index) => (
          <Pressable
            key={index}
            style={[styles.rewardCard, reward.disabled && { opacity: 0.5 }]}
            onPress={reward.onPress}
            disabled={reward.disabled}
          >
            <Image source={{ uri: reward.image }} style={styles.rewardImage} />
            <View style={styles.rewardOverlay} />
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.rewardPoints}>{reward.points}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.redeemSection}>
        <MaterialIcons name="card-giftcard" size={30} color={PRIMARY_COLOR} />
        <Text style={styles.redeemSectionText}>
          Use your coins to unlock premium services, airtime, and discounts!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HEADER_BG,
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    textAlign: "center",
    marginVertical: 10,
  },
  balanceCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  balanceText: {
    color: BACKGROUND_COLOR,
    fontSize: 13,
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: "bold",
    color: BACKGROUND_COLOR,
  },
  redeemButton: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 8,
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  redeemText: {
    color: PRIMARY_COLOR,
    fontWeight: "bold",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    marginBottom: 12,
  },
  rewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  rewardCard: {
    width: "48%",
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: BACKGROUND_COLOR,
    elevation: 3,
  },
  rewardImage: {
    width: "100%",
    height: "100%",
  },
  rewardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  rewardInfo: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: BACKGROUND_COLOR,
    marginBottom: 2,
  },
  rewardPoints: {
    fontSize: 13,
    color: SECONDARY_COLOR,
    fontWeight: "600",
  },
  redeemSection: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    elevation: 2,
  },
  redeemSectionText: {
    flex: 1,
    color: INACTIVE_COLOR,
    fontSize: 14,
    lineHeight: 20,
  },
});
