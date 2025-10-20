import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

export default function Rewards() {
  const rewards = [
    {
      title: "Daily Login Bonus",
      points: "+50 Coins",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3",
    },
    {
      title: "Refer a Friend",
      points: "+500 Coins",
      image: "https://images.unsplash.com/photo-1544717305-2782549b5136",
    },
    {
      title: "Complete Profile",
      points: "+200 Coins",
      image: "https://images.unsplash.com/photo-1515165562835-c3b8f63c2dca",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      {/* Header */}
      <Text style={styles.headerTitle}>Rewards & Services</Text>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceText}>Your Total Reward Coins</Text>
        <Text style={styles.balanceValue}>
          <FontAwesome5 name="coins" size={18} color={BACKGROUND_COLOR} /> 4,250
        </Text>
        <Pressable onPress={() => alert("Redeem Coins")} style={styles.redeemButton}>
          <Text style={styles.redeemText}>Redeem Now</Text>
        </Pressable>
      </View>

      {/* Available Rewards */}
      <Text style={styles.sectionTitle}>Available Rewards</Text>

      <View style={styles.rewardsGrid}>
        {rewards.map((reward, index) => (
          <Pressable
            key={index}
            style={styles.rewardCard}
            onPress={() => alert(`${reward.title} selected`)}
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

      {/* Redeem Section */}
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
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  balanceText: {
    color: BACKGROUND_COLOR,
    fontSize: 13,
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: BACKGROUND_COLOR,
  },
  redeemButton: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  redeemText: {
    color: PRIMARY_COLOR,
    fontWeight: "bold",
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    marginBottom: 10,
  },
  rewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  rewardCard: {
    width: "48%",
    height: 140,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: BACKGROUND_COLOR,
    elevation: 2,
  },
  rewardImage: {
    width: "100%",
    height: "100%",
  },
  rewardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  rewardInfo: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
  },
  rewardTitle: {
    color: BACKGROUND_COLOR,
    fontWeight: "bold",
    fontSize: 14,
  },
  rewardPoints: {
    color: SECONDARY_COLOR,
    fontSize: 12,
  },
  redeemSection: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    elevation: 2,
  },
  redeemSectionText: {
    color: INACTIVE_COLOR,
    fontSize: 14,
    flexShrink: 1,
  },
});
