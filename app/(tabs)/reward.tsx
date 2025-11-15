// reward.tsx
import { auth, db } from "@/lib/firebase";
import { handleDailyCheckIn, redeemBonus, subscribeToUserBonus } from "@/lib/rewards";
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  Text as RNText,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { Text } from "react-native-paper";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";
const CARD_BG = "#FFFFFF";

const { width } = Dimensions.get("window");

type AlertButton = { text: string; action?: () => void; style?: "primary" | "default" | "cancel" };

export default function Rewards(): React.JSX.Element {
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [checkedIn, setCheckedIn] = useState<boolean>(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; message: string; buttons?: AlertButton[] } | null>(null);

  // For decorative glow animation
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }, [glowAnim]);

  useEffect(() => {
    // load check-in status
    const loadCheckInStatus = async () => {
      try {
        const lastCheckIn = await AsyncStorage.getItem("lastCheckIn");
        if (lastCheckIn && Date.now() - parseInt(lastCheckIn, 10) < 24 * 60 * 60 * 1000) {
          setCheckedIn(true);
        } else {
          setCheckedIn(false);
        }
      } catch (e) {
        // ignore
      }
    };
    loadCheckInStatus();

    // subscribe to user's bonus balance
    const unsubBonus = subscribeToUserBonus((value: number) => {
      setBonusBalance(value ?? 0);
    });

    // subscribe to referral code on user doc (if logged in)
    const user = auth.currentUser;
    let unsubReferral: (() => void) | null = null;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      unsubReferral = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          setReferralCode(data?.referralCode ?? null);
        }
      });
    }

    return () => {
      unsubBonus && unsubBonus();
      unsubReferral && unsubReferral();
    };
  }, []);

  const openModal = (title: string, message: string, buttons?: AlertButton[]) => {
    setModal({ title, message, buttons });
  };

  const closeModal = () => setModal(null);

  // Handlers
  const onCheckIn = async () => {
    if (checkedIn) {
      openModal("⏳ Come back tomorrow!", "You can only check in once per day.");
      return;
    }

    try {
      await handleDailyCheckIn();
      await AsyncStorage.setItem("lastCheckIn", Date.now().toString());
      setCheckedIn(true);
      openModal("✅ Check-In Successful!", "You earned 1 bonus coin!");
    } catch (err) {
      openModal("Error", "Could not complete check-in. Please try again.");
    }
  };

  const onRedeem = async () => {
    if (bonusBalance <= 0) {
      openModal("Insufficient Balance", "You need coins to redeem rewards.");
      return;
    }
    try {
      await redeemBonus();
      openModal("🎉 Redeemed!", "Your bonus has been added to your balance.");
    } catch (err) {
      openModal("Error", "Redeem failed. Try again later.");
    }
  };

  const onReferPress = async () => {
    if (!referralCode) {
      openModal("No Referral Code", "Your referral code is not available yet.");
      return;
    }
    const referralLink = `https://callondemand.app/signup?ref=${referralCode}`;

    openModal("Refer a Friend 🎁", `Share this link to invite your friends!\n\n${referralLink}`, [
      {
        text: "Copy Link",
        action: async () => {
          await Clipboard.setStringAsync(referralLink);
          // show small confirm modal
          openModal("Copied!", "Referral link copied to clipboard.");
        },
        style: "primary",
      },
      {
        text: "Share",
        action: async () => {
          try {
            await Share.share({
              message: `Join EliteHub and earn rewards! Sign up with my referral link: ${referralLink}`,
            });
          } catch (e) {
            // ignore
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const rewards = [
    {
      title: "Daily Check-In",
      points: "+1 Coins/day",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80&auto=format&fit=crop",
      onPress: onCheckIn,
      disabled: checkedIn,
      icon: "check",
    },
    {
      title: "Refer a Friend",
      points: "+100 Coins",
      image: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80&auto=format&fit=crop",
      onPress: onReferPress,
      disabled: false,
      icon: "users",
    },
    {
      title: "Complete Profile",
      points: "+100 Coins",
      image: "https://images.unsplash.com/photo-1515165562835-c3b8f63c2dca?w=800&q=80&auto=format&fit=crop",
      onPress: () => router.push("/profile/CompleteProfile"),
      disabled: false,
      icon: "id-badge",
    },
  ];

  // Stats (kept local for now — replace with real data if available)
  const stats = [
    { label: "Tasks Completed", value: 12, icon: "bullseye" },
    { label: "Day Streak", value: 7, icon: "fire" },
    { label: "Referrals", value: 3, icon: "users" },
  ];

  // Animated glow style interpolation
  const glowInterpolate = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.02, 0.14], // opacity multiplier
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Rewards & Services</Text>

        {/* Balance Card with decorative glow */}
        <View style={styles.balanceWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.balanceCardGlow,
              {
                opacity: glowInterpolate,
                transform: [{ scale: 1.05 }],
              },
            ]}
          />
          <View style={styles.balanceCard}>
            <View style={styles.coinIconContainer}>
              <RNText style={styles.coinIcon}>🪙</RNText>
            </View>
            <RNText style={styles.balanceText}>Your Total Reward Coins</RNText>
            <RNText style={styles.balanceValue}>
              <FontAwesome5 name="coins" size={18} color={CARD_BG} /> {bonusBalance}
            </RNText>

            <Pressable onPress={onRedeem} style={({ pressed }) => [styles.redeemButton, pressed && styles.redeemPressed]}>
              <RNText style={styles.redeemText}>
                <RNText style={styles.redeemIcon}>✨</RNText> Redeem Now
              </RNText>
            </Pressable>
          </View>
        </View>

        {/* Available Rewards */}
        <RNText style={styles.sectionTitle}>Available Rewards</RNText>
        <View style={styles.rewardsGrid}>
          {rewards.map((reward, idx) => {
            const isDisabled = !!reward.disabled;
            return (
              <Pressable
                key={idx}
                onPress={reward.onPress}
                disabled={isDisabled}
                style={({ pressed }) => [
                  styles.rewardCard,
                  isDisabled && styles.rewardCardDisabled,
                  pressed && !isDisabled && styles.rewardCardPressed,
                ]}
              >
                <Image source={{ uri: reward.image }} style={styles.rewardImage} />
                <View style={styles.rewardOverlay} />

                <View style={styles.rewardContent}>
                  <View style={styles.rewardIcon}>
                    <FontAwesome5 name={reward.icon as any} size={18} color={CARD_BG} />
                  </View>

                  <View style={styles.rewardInfo}>
                    <RNText style={styles.rewardTitle}>{reward.title}</RNText>
                    <RNText style={styles.rewardPoints}>{reward.points}</RNText>
                  </View>

                  {isDisabled && (
                    <View style={styles.checkmark}>
                      <RNText style={styles.checkmarkText}>✓</RNText>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoIconContainer}>
            <RNText style={styles.infoIcon}>🎁</RNText>
          </View>
          <View style={styles.infoContent}>
            <RNText style={styles.infoTitle}>How to Use Your Coins</RNText>
            <RNText style={styles.infoText}>
              Use your coins to unlock premium services, airtime, and exclusive discounts!
            </RNText>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View style={styles.statCard} key={i}>
              <View style={styles.statIconContainer}>
                <FontAwesome5 name={s.icon as any} size={20} color={PRIMARY_COLOR} />
              </View>
              <RNText style={styles.statValue}>{s.value}</RNText>
              <RNText style={styles.statLabel}>{s.label}</RNText>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Custom Modal (replicates web alert) */}
      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <RNText style={styles.modalTitle}>{modal?.title}</RNText>
            <RNText style={styles.modalMessage}>{modal?.message}</RNText>

            <View style={styles.modalButtons}>
              {modal?.buttons ? (
                modal.buttons.map((btn, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      btn.action?.();
                      if (btn.style !== "primary") closeModal();
                    }}
                    style={[
                      styles.modalButton,
                      btn.style === "primary" ? styles.modalButtonPrimary : {},
                      btn.style === "cancel" ? styles.modalButtonCancel : {},
                    ]}
                  >
                    <RNText style={[styles.modalButtonText, btn.style === "primary" && styles.modalButtonTextPrimary]}>
                      {btn.text}
                    </RNText>
                  </TouchableOpacity>
                ))
              ) : (
                <TouchableOpacity
                  onPress={closeModal}
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                >
                  <RNText style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>OK</RNText>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: HEADER_BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    textAlign: "center",
    marginBottom: 18,
    letterSpacing: -0.5,
  },

  // Balance card / glow
  balanceWrap: {
    marginBottom: 22,
    alignItems: "center",
  },
  balanceCardGlow: {
    position: "absolute",
    top: -30,
    left: -30,
    width: width * 1.2,
    height: 160,
    borderRadius: 160,
    backgroundColor: SECONDARY_COLOR,
    opacity: 0.06,
  },
  balanceCard: {
    width: "100%",
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  coinIconContainer: {
    width: 60,
    height: 60,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  coinIcon: {
    fontSize: 28,
  },
  balanceText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: "700",
    color: CARD_BG,
    marginBottom: 12,
  },
  redeemButton: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  redeemPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  redeemText: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
    fontSize: 15,
  },
  redeemIcon: {
    fontSize: 16,
  },

  // Section
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1B1F",
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  // Rewards grid
  rewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  rewardCard: {
    width: "48%",
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: CARD_BG,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  rewardCardDisabled: {
    opacity: 0.6,
  },
  rewardCardPressed: {
    transform: [{ scale: 0.985 }],
  },
  rewardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    resizeMode: "cover",
  },
  rewardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  rewardContent: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rewardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: CARD_BG,
    marginBottom: 2,
  },
  rewardPoints: {
    fontSize: 13,
    color: SECONDARY_COLOR,
    fontWeight: "700",
  },
  checkmark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SUCCESS_COLOR,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  checkmarkText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  // Info section
  infoSection: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}20`,
    alignItems: "center",
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  infoIcon: {
    fontSize: 22,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#49454F",
    lineHeight: 20,
  },

  // Stats
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  statCard: {
    width: (width - 16 * 2 - 12 * 2) / 3,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: INACTIVE_COLOR,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1B1F",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 15,
    color: "#49454F",
    lineHeight: 20,
    marginBottom: 18,
    
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: HEADER_BG,
    marginLeft: 8,
  },
  modalButtonPrimary: {
    backgroundColor: PRIMARY_COLOR,
  },
  modalButtonCancel: {
    backgroundColor: HEADER_BG,
  },
  modalButtonText: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
  },
  modalButtonTextPrimary: {
    color: CARD_BG,
  },
});
