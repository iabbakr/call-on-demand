// reward.tsx - Optimized & Responsive
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
  Text as RNText,
  SafeAreaView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

/* ─── Constants ─── */
const COLORS = {
  primary: "#6200EE",
  secondary: "#03DAC6",
  accent: "#E8DEF8",
  success: "#4CAF50",
  inactive: "#757575",
  background: "#FAFAFA",
  card: "#FFFFFF",
  textPrimary: "#1C1B1F",
  textSecondary: "#49454F",
};

const { width } = Dimensions.get("window");
const SPACING = 16;
const CARD_BORDER_RADIUS = 16;
const STREAK_DAYS = 7;

/* ─── Types ─── */
type AlertButton = { text: string; action?: () => void; style?: "primary" | "default" | "cancel" };
type Reward = { title: string; points: string; image: string; onPress: () => void; disabled: boolean; icon: string };

/* ─── Main Component ─── */
export default function Rewards() {
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [checkedInToday, setCheckedInToday] = useState<boolean>(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; message: string; buttons?: AlertButton[] } | null>(null);

  const glowAnim = useRef(new Animated.Value(0)).current;
  const streakPulse = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  /* ─── Animations ─── */
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const startStreakPulse = () => {
    streakPulse.setValue(1.2);
    Animated.spring(streakPulse, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  /* ─── Firestore Listeners ─── */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as any;
      setBonusBalance(data?.bonusBalance ?? 0);
      setReferralCode(data?.referralCode ?? null);

      const last = data?.lastCheckIn?.toDate?.();
      const today = new Date();
      const isToday = last && last.getFullYear() === today.getFullYear() &&
                      last.getMonth() === today.getMonth() && last.getDate() === today.getDate();
      setCheckedInToday(!!isToday);
      setStreak(data?.streakCount ?? 0);
    });

    const unsubBonus = subscribeToUserBonus((v) => setBonusBalance(v ?? 0));
    return () => { unsubUser(); unsubBonus(); };
  }, []);

  /* ─── Modal Helpers ─── */
  const openModal = (title: string, message: string, buttons?: AlertButton[]) => setModal({ title, message, buttons });
  const closeModal = () => setModal(null);

  /* ─── Handlers ─── */
  const onCheckIn = async () => {
    if (checkedInToday) return openModal("Come back tomorrow!", "You can only check-in once per day.");
    try {
      const result = await handleDailyCheckIn();
      setCheckedInToday(true);
      setStreak(result.streak ?? 0);
      if (result.rewarded) {
        startStreakPulse();
        openModal("🎉 7-Day Streak Completed!", "You earned 10 bonus coins!", [{ text: "Awesome!", style: "primary" }]);
      } else openModal("✅ Check-In Successful!", "You earned 1 bonus coin!");
    } catch { openModal("Error", "Could not complete check-in."); }
  };

  const onRedeem = async () => {
    if (bonusBalance <= 0) return openModal("No coins", "You need coins to redeem.");
    try { await redeemBonus(); openModal("Redeemed!", "Your bonus added to balance."); } catch { openModal("Error", "Redeem failed."); }
  };

  const onReferPress = async () => {
    if (!referralCode) return openModal("No code", "Your referral code is not ready yet.");
    const link = `https://callondemand.app/signup?ref=${referralCode}`;
    openModal("Refer a Friend", `Share this link:\n\n${link}`, [
      { text: "Copy", style: "primary", action: async () => { await Clipboard.setStringAsync(link); openModal("Copied!", "Link copied!"); } },
      { text: "Share", action: async () => { await Share.share({ message: `Join EliteHub! ${link}` }); } },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  /* ─── Data ─── */
  const rewards: Reward[] = [
    { title: "Daily Check-In", points: "+1 Coins/day", image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80", onPress: onCheckIn, disabled: checkedInToday, icon: "check-circle" },
    { title: "Refer a Friend", points: "+100 Coins", image: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80", onPress: onReferPress, disabled: false, icon: "users" },
    { title: "Complete Profile", points: "+100 Coins", image: "https://images.unsplash.com/photo-1515165562835-c3b8f63c2dca?w=800&q=80", onPress: () => router.push("/profile/CompleteProfile"), disabled: false, icon: "id-badge" },
  ];

  const stats = [
    { label: "Tasks Completed", value: 12, icon: "check-circle" },
    { label: "Day Streak", value: streak, icon: "fire" },
    { label: "Referrals", value: 3, icon: "user-friends" },
  ];

  const glowInterpolate = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.15] });

  /* ─── Render Helpers ─── */
  const RewardCard = ({ r }: { r: Reward }) => {
    const disabled = r.disabled;
    return (
      <Pressable onPress={r.onPress} disabled={disabled} style={({ pressed }) => [{ width: "48%", marginBottom: 12, borderRadius: CARD_BORDER_RADIUS, overflow: "hidden", opacity: disabled ? 0.5 : 1, transform: pressed && !disabled ? [{ scale: 0.97 }] : [{ scale: 1 }] }]}>
        <Image source={{ uri: r.image }} style={{ width: "100%", height: 120, resizeMode: "cover" }} />
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: disabled ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.15)" }} />
        <View style={{ position: "absolute", bottom: 8, left: 8, right: 8, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginRight: 8 }}>
            <FontAwesome5 name={r.icon as any} size={20} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <RNText style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>{r.title}</RNText>
            <RNText style={{ color: "#FFF", fontSize: 12 }}>{r.points}</RNText>
          </View>
          {disabled && <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.success, alignItems: "center", justifyContent: "center" }}><FontAwesome5 name="check" size={16} color="#FFF" /></View>}
        </View>
      </Pressable>
    );
  };

  const StatCard = ({ s }: any) => (
    <View style={{ flex: 1, backgroundColor: COLORS.card, borderRadius: CARD_BORDER_RADIUS, paddingVertical: 20, paddingHorizontal: 12, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3 }}>
      <View style={{ marginBottom: 12, width: 48, height: 48, borderRadius: 24, backgroundColor: s.icon === "fire" ? "#FFF4F0" : `${COLORS.primary}15`, alignItems: "center", justifyContent: "center" }}>
        <FontAwesome5 name={s.icon} size={22} color={s.icon === "fire" ? "#FF6B35" : COLORS.primary} />
      </View>
      <RNText style={{ fontSize: 24, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 4 }}>{s.value}</RNText>
      <RNText style={{ fontSize: 12, color: COLORS.textSecondary }}>{s.label}</RNText>
    </View>
  );

  const ModalButton = ({ b }: { b: AlertButton }) => (
    <TouchableOpacity
      onPress={() => { b.action?.(); if (b.style !== "primary") closeModal(); }}
      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: b.style === "primary" ? COLORS.primary : b.style === "cancel" ? "#CCC" : "#EEE", marginLeft: 8 }}
    >
      <RNText style={{ fontSize: 14, color: b.style === "primary" ? "#FFF" : COLORS.textPrimary, fontWeight: b.style === "primary" ? "700" : "400" }}>{b.text}</RNText>
    </TouchableOpacity>
  );

  /* ─── Render ─── */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Animated.ScrollView style={{ flex: 1, paddingHorizontal: SPACING, paddingTop: SPACING, opacity: fadeAnim }} contentContainerStyle={{ paddingBottom: 40 }}>
        <RNText style={{ fontSize: 28, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 24 }}>Rewards & Bonuses</RNText>

        {/* Balance Card */}
        <View style={{ marginBottom: 24, alignItems: "center" }}>
          <Animated.View pointerEvents="none" style={{ position: "absolute", width: width - SPACING * 2, height: 200, borderRadius: 24, backgroundColor: COLORS.secondary, opacity: glowInterpolate }} />
          <View style={{ width: "100%", backgroundColor: COLORS.primary, borderRadius: 24, paddingVertical: 32, paddingHorizontal: 24, alignItems: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 8 }}>
            <View style={{ width: 72, height: 72, marginBottom: 16, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 36, alignItems: "center", justifyContent: "center" }}>
              <FontAwesome5 name="coins" size={32} color="#FFD700" />
            </View>
            <RNText style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, marginBottom: 8, fontWeight: "500" }}>Total Reward Coins</RNText>
            <RNText style={{ fontSize: 48, fontWeight: "800", color: "#FFF", marginBottom: 20 }}>{bonusBalance}</RNText>
            <Pressable onPress={onRedeem} style={({ pressed }) => [{ backgroundColor: "#FFF", borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 8, transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }] }]}>
              <FontAwesome5 name="sparkles" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
              <RNText style={{ color: COLORS.primary, fontWeight: "700", fontSize: 16 }}>Redeem Now</RNText>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>{stats.map((s, i) => <StatCard key={i} s={s} />)}</View>

        {/* Streak */}
        <View style={{ backgroundColor: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 24 }}>
          <RNText style={{ fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 }}><FontAwesome5 name="fire" size={16} color="#FF6B35" /> 7-Day Streak Challenge</RNText>
          <RNText style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 }}>Complete 7 days in a row to earn 10 bonus coins!</RNText>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {Array.from({ length: STREAK_DAYS }).map((_, idx) => {
              const filled = idx < streak;
              const isCurrent = idx === streak - 1 && filled;
              return (
                <Animated.View key={idx} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "#DDD", alignItems: "center", justifyContent: "center", backgroundColor: filled ? COLORS.success : "#FFF", transform: isCurrent ? [{ scale: streakPulse }] : [{ scale: 1 }] }}>
                  {filled ? <FontAwesome5 name="check" size={14} color="#FFF" /> : <RNText style={{ color: COLORS.textSecondary, fontWeight: "700" }}>{idx + 1}</RNText>}
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Rewards */}
        <RNText style={{ fontSize: 20, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 12 }}>Available Rewards</RNText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>{rewards.map((r, i) => <RewardCard key={i} r={r} />)}</View>

        {/* Info */}
        <View style={{ flexDirection: "row", padding: 16, backgroundColor: COLORS.card, borderRadius: CARD_BORDER_RADIUS }}>
          <View style={{ marginRight: 12, alignItems: "center", justifyContent: "center" }}><FontAwesome5 name="gift" size={24} color={COLORS.primary} /></View>
          <View style={{ flex: 1 }}>
            <RNText style={{ fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 }}>How to Use Your Coins</RNText>
            <RNText style={{ fontSize: 12, color: COLORS.textSecondary }}>Redeem your coins to unlock premium services, airtime, and exclusive discounts!</RNText>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Modal */}
      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" }} onPress={closeModal}>
          <Pressable style={{ width: "80%", backgroundColor: "#FFF", borderRadius: 16, padding: 20 }} onPress={(e) => e.stopPropagation()}>
            <RNText style={{ fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 8 }}>{modal?.title}</RNText>
            <RNText style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 }}>{modal?.message}</RNText>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
              {modal?.buttons ? modal.buttons.map((b, i) => <ModalButton key={i} b={b} />) : <ModalButton b={{ text: "OK", style: "primary" }} />}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
