// reward.tsx - Enhanced & Optimized
import { auth, db } from "@/lib/firebase";
import {
  handleDailyCheckIn,
  redeemBonus,
  subscribeToUserBonus,
} from "@/lib/rewards";
import { FontAwesome5 } from "@expo/vector-icons";
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
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";

/* ─── Constants ─── */
const COLORS = {
  primary: "#6200EE",
  primaryLight: "#7C3AED",
  secondary: "#03DAC6",
  accent: "#F3F0FF",
  success: "#10B981",
  successLight: "#D1FAE5",
  fire: "#FF6B35",
  fireLight: "#FFF4F0",
  gold: "#FFD700",
  background: "#F8F9FA",
  card: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  overlay: "rgba(0, 0, 0, 0.6)",
  shadow: "#000",
};

const { width } = Dimensions.get("window");
const SPACING = 16;
const CARD_RADIUS = 16;
const LARGE_RADIUS = 24;
const STREAK_DAYS = 7;

/* ─── Types ─── */
type AlertButton = {
  text: string;
  action?: () => void;
  style?: "primary" | "secondary" | "cancel";
};

type Reward = {
  title: string;
  points: string;
  image: string;
  onPress: () => void;
  disabled: boolean;
  icon: keyof typeof FontAwesome5.glyphMap;
};

type Stat = {
  label: string;
  value: number;
  icon: keyof typeof FontAwesome5.glyphMap;
};

/* ─── Main Component ─── */
export default function Rewards() {
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [checkedInToday, setCheckedInToday] = useState<boolean>(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    buttons?: AlertButton[];
  } | null>(null);

  const glowAnim = useRef(new Animated.Value(0)).current;
  const streakPulse = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  /* ─── Animations ─── */
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [fadeAnim, glowAnim]);

  const startStreakPulse = () => {
    streakPulse.setValue(1.3);
    Animated.spring(streakPulse, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  /* ─── Firestore Listeners ─── */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      
      setBonusBalance(data?.bonusBalance ?? 0);
      setReferralCode(data?.referralCode ?? null);

      const lastCheckIn = data?.lastCheckIn?.toDate?.();
      const today = new Date();
      const isToday =
        lastCheckIn &&
        lastCheckIn.getFullYear() === today.getFullYear() &&
        lastCheckIn.getMonth() === today.getMonth() &&
        lastCheckIn.getDate() === today.getDate();
      
      setCheckedInToday(!!isToday);
      setStreak(data?.streakCount ?? 0);
    });

    const unsubBonus = subscribeToUserBonus((balance) =>
      setBonusBalance(balance ?? 0)
    );

    return () => {
      unsubUser();
      unsubBonus();
    };
  }, []);

  /* ─── Modal Helpers ─── */
  const openModal = (
    title: string,
    message: string,
    buttons?: AlertButton[]
  ) => {
    setModal({ title, message, buttons });
  };

  const closeModal = () => setModal(null);

  /* ─── Handlers ─── */
  const onCheckIn = async () => {
    if (checkedInToday) {
      return openModal(
        "Come back tomorrow!",
        "You can only check-in once per day."
      );
    }

    try {
      const result = await handleDailyCheckIn();
      setCheckedInToday(true);
      setStreak(result.streak ?? 0);

      if (result.rewarded) {
        startStreakPulse();
        openModal("🎉 7-Day Streak Completed!", "You earned 10 bonus coins!", [
          { text: "Awesome!", style: "primary" },
        ]);
      } else {
        openModal("✅ Check-In Successful!", "You earned 1 bonus coin!");
      }
    } catch (error) {
      openModal("Error", "Could not complete check-in. Please try again.");
    }
  };

  const onRedeem = async () => {
    if (bonusBalance <= 0) {
      return openModal("No coins", "You need coins to redeem.");
    }

    try {
      await redeemBonus();
      openModal("Redeemed!", "Your bonus has been added to your balance.");
    } catch (error) {
      openModal("Error", "Redeem failed. Please try again.");
    }
  };

  const onReferPress = async () => {
    if (!referralCode) {
      return openModal("No code", "Your referral code is not ready yet.");
    }

    const link = `https://callondemand.app/signup?ref=${referralCode}`;
    openModal("Refer a Friend", `Share this link:\n\n${link}`, [
      {
        text: "Copy",
        style: "primary",
        action: async () => {
          await Clipboard.setStringAsync(link);
          openModal("Copied!", "Link copied to clipboard!");
        },
      },
      {
        text: "Share",
        style: "secondary",
        action: async () => {
          await Share.share({ message: `Join EliteHub! ${link}` });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  /* ─── Data ─── */
  const rewards: Reward[] = [
    {
      title: "Daily Check-In",
      points: "+1 Coins/day",
      image:
        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80",
      onPress: onCheckIn,
      disabled: checkedInToday,
      icon: "check-circle",
    },
    {
      title: "Refer a Friend",
      points: "+100 Coins",
      image:
        "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80",
      onPress: onReferPress,
      disabled: false,
      icon: "user-friends",
    },
    {
      title: "Complete Profile",
      points: "+100 Coins",
      image:
        "https://images.unsplash.com/photo-1515165562835-c3b8f63c2dca?w=800&q=80",
      onPress: () => router.push("/profile/CompleteProfile"),
      disabled: false,
      icon: "id-badge",
    },
  ];

  const stats: Stat[] = [
    { label: "Tasks Done", value: 12, icon: "check-circle" },
    { label: "Day Streak", value: streak, icon: "fire" },
    { label: "Referrals", value: 3, icon: "user-friends" },
  ];

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.2],
  });

  /* ─── Render Components ─── */
  const RewardCard = ({ reward }: { reward: Reward }) => {
    const { disabled } = reward;

    return (
      <Pressable
        onPress={reward.onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.rewardCard,
          {
            opacity: disabled ? 0.6 : 1,
            transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
          },
        ]}
      >
        <Image source={{ uri: reward.image }} style={styles.rewardImage} />
        <View
          style={[
            styles.rewardOverlay,
            {
              backgroundColor: disabled
                ? "rgba(0,0,0,0.5)"
                : "rgba(0,0,0,0.2)",
            },
          ]}
        />
        <View style={styles.rewardContent}>
          <View style={styles.rewardIconContainer}>
            <FontAwesome5 name={reward.icon} size={20} color={COLORS.card} />
          </View>
          <View style={styles.rewardTextContainer}>
            <Text style={styles.rewardTitle}>{reward.title}</Text>
            <Text style={styles.rewardPoints}>{reward.points}</Text>
          </View>
          {disabled && (
            <View style={styles.completedBadge}>
              <FontAwesome5 name="check" size={14} color={COLORS.card} />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const StatCard = ({ stat }: { stat: Stat }) => (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIconContainer,
          {
            backgroundColor:
              stat.icon === "fire" ? COLORS.fireLight : COLORS.accent,
          },
        ]}
      >
        <FontAwesome5
          name={stat.icon}
          size={22}
          color={stat.icon === "fire" ? COLORS.fire : COLORS.primary}
        />
      </View>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </View>
  );

  const ModalButton = ({ button }: { button: AlertButton }) => (
    <Pressable
      onPress={() => {
        button.action?.();
        if (button.style !== "primary") closeModal();
      }}
      style={({ pressed }) => [
        styles.modalButton,
        button.style === "primary" && styles.modalButtonPrimary,
        button.style === "secondary" && styles.modalButtonSecondary,
        button.style === "cancel" && styles.modalButtonCancel,
        pressed && styles.modalButtonPressed,
      ]}
    >
      <Text
        style={[
          styles.modalButtonText,
          button.style === "primary" && styles.modalButtonTextPrimary,
        ]}
      >
        {button.text}
      </Text>
    </Pressable>
  );

  /* ─── Render ─── */
  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Rewards & Bonuses</Text>

        {/* Balance Card */}
        <View style={styles.balanceCardContainer}>
          <Animated.View
            pointerEvents="none"
            style={[styles.balanceGlow, { opacity: glowOpacity }]}
          />
          <View style={styles.balanceCard}>
            <View style={styles.balanceCoinIcon}>
              <FontAwesome5 name="coins" size={32} color={COLORS.gold} />
            </View>
            <Text style={styles.balanceLabel}>Total Reward Coins</Text>
            <Text style={styles.balanceAmount}>{bonusBalance}</Text>
            <Pressable
              onPress={onRedeem}
              style={({ pressed }) => [
                styles.redeemButton,
                pressed && styles.redeemButtonPressed,
              ]}
            >
              <FontAwesome5 name="sparkles" size={16} color={COLORS.primary} />
              <Text style={styles.redeemButtonText}>Redeem Now</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {stats.map((stat, idx) => (
            <StatCard key={idx} stat={stat} />
          ))}
        </View>

        {/* Streak Challenge */}
        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <Text style={styles.streakTitle}>
              <FontAwesome5 name="fire" size={16} color={COLORS.fire} /> 7-Day
              Streak Challenge
            </Text>
            <Text style={styles.streakSubtitle}>
              Complete 7 days in a row to earn 10 bonus coins!
            </Text>
          </View>
          <View style={styles.streakDots}>
            {Array.from({ length: STREAK_DAYS }).map((_, idx) => {
              const filled = idx < streak;
              const isCurrent = idx === streak - 1 && filled;
              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.streakDot,
                    filled && styles.streakDotFilled,
                    {
                      transform: isCurrent
                        ? [{ scale: streakPulse }]
                        : [{ scale: 1 }],
                    },
                  ]}
                >
                  {filled ? (
                    <FontAwesome5 name="check" size={14} color={COLORS.card} />
                  ) : (
                    <Text style={styles.streakDotNumber}>{idx + 1}</Text>
                  )}
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Rewards Grid */}
        <Text style={styles.sectionTitle}>Available Rewards</Text>
        <View style={styles.rewardsGrid}>
          {rewards.map((reward, idx) => (
            <RewardCard key={idx} reward={reward} />
          ))}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <FontAwesome5 name="gift" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How to Use Your Coins</Text>
            <Text style={styles.infoText}>
              Redeem your coins to unlock premium services, airtime, and
              exclusive discounts!
            </Text>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Modal */}
      <Modal
        visible={!!modal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{modal?.title}</Text>
            <Text style={styles.modalMessage}>{modal?.message}</Text>
            <View style={styles.modalButtons}>
              {modal?.buttons ? (
                modal.buttons.map((button, idx) => (
                  <ModalButton key={idx} button={button} />
                ))
              ) : (
                <ModalButton button={{ text: "OK", style: "primary" }} />
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 24,
    letterSpacing: -0.5,
  },

  /* Balance Card */
  balanceCardContainer: {
    marginBottom: 24,
    alignItems: "center",
  },
  balanceGlow: {
    position: "absolute",
    width: width - SPACING * 2,
    height: 220,
    borderRadius: LARGE_RADIUS,
    backgroundColor: COLORS.secondary,
  },
  balanceCard: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: LARGE_RADIUS,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  balanceCoinIcon: {
    width: 72,
    height: 72,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 56,
    fontWeight: "800",
    color: COLORS.card,
    marginBottom: 20,
    letterSpacing: -2,
  },
  redeemButton: {
    backgroundColor: COLORS.card,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  redeemButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  redeemButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 16,
  },

  /* Stats */
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: CARD_RADIUS,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    marginBottom: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  /* Streak Card */
  streakCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  streakHeader: {
    marginBottom: 16,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  streakSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  streakDots: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  streakDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
  },
  streakDotFilled: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  streakDotNumber: {
    color: COLORS.textSecondary,
    fontWeight: "700",
    fontSize: 14,
  },

  /* Rewards Grid */
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  rewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  rewardCard: {
    width: "48%",
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  rewardImage: {
    width: "100%",
    height: 140,
    resizeMode: "cover",
  },
  rewardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  rewardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  rewardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rewardTextContainer: {
    flex: 1,
  },
  rewardTitle: {
    color: COLORS.card,
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 2,
  },
  rewardPoints: {
    color: COLORS.card,
    fontSize: 12,
    opacity: 0.9,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Info Card */
  infoCard: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: CARD_RADIUS,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIconContainer: {
    marginRight: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    minWidth: 80,
    alignItems: "center",
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonSecondary: {
    backgroundColor: COLORS.secondary,
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  modalButtonText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  modalButtonTextPrimary: {
    color: COLORS.card,
    fontWeight: "700",
  },
});