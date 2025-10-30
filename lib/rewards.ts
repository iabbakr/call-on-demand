// lib/rewards.ts
import {
  doc,
  getDoc,
  increment,
  onSnapshot,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// 🟢 Add bonus coins helper
export async function addBonusToUser(coins: number) {
  const user = auth.currentUser;
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, { bonusBalance: increment(coins) });
}

// ✅ Referral reward
export async function rewardForReferral() {
  await addBonusToUser(100);
}

// ✅ Daily check-in (5-day streak logic)
export async function handleDailyCheckIn() {
  const user = auth.currentUser;
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  const today = new Date();
  const lastCheckIn = data.lastCheckIn ? data.lastCheckIn.toDate() : null;
  const streakCount = data.streakCount || 0;
  let newStreak = streakCount;
  let bonus = 0;

  if (
    !lastCheckIn ||
    (today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24) >= 1
  ) {
    if (
      lastCheckIn &&
      (today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24) <= 2
    ) {
      newStreak++;
    } else {
      newStreak = 1;
    }
    bonus = 10;
  }

  if (newStreak >= 5) {
    await updateDoc(userRef, {
      bonusBalance: increment(bonus + 50),
      streakCount: 0,
      lastCheckIn: Timestamp.now(),
    });
  } else {
    await updateDoc(userRef, {
      bonusBalance: increment(bonus),
      lastCheckIn: Timestamp.now(),
      streakCount: newStreak,
    });
  }
}

// ✅ Profile completion reward
export async function rewardForProfileCompletion() {
  const user = auth.currentUser;
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  if (!data.profileCompleted) {
    await updateDoc(userRef, {
      profileCompleted: true,
      bonusBalance: increment(100),
    });
  }
}

// ✅ Redeem coins (bonus → balance)
export async function redeemBonus() {
  const user = auth.currentUser;
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const { bonusBalance = 0, balance = 0 } = userSnap.data();

  if (bonusBalance > 0) {
    await updateDoc(userRef, {
      balance: balance + bonusBalance,
      bonusBalance: 0,
    });
  }
}

// ✅ Listen to bonus balance updates
export function subscribeToUserBonus(callback: (balance: number) => void) {
  const user = auth.currentUser;
  if (!user) return () => {};
  const userRef = doc(db, "users", user.uid);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) callback(snap.data().bonusBalance || 0);
  });
}
