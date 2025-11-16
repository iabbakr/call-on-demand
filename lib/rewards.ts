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

// ---------------------------------------------------------
// ✅ Daily Check-In — 7-Day Streak Reward Logic (Option C)
// ---------------------------------------------------------
//
// ✔ Always returns: { rewarded: boolean; streak: number }
// ✔ Never returns undefined
// ✔ On day 7 → reward + reset streak to 0
// ✔ Reward day does NOT count as streak
// ✔ User must check in the next day to start new streak
//
export async function handleDailyCheckIn(): Promise<{
  rewarded: boolean;
  streak: number;
}> {
  const user = auth.currentUser;

  if (!user) return { rewarded: false, streak: 0 };

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return { rewarded: false, streak: 0 };

  const data = userSnap.data();

  const today = new Date();
  const lastCheckIn = data.lastCheckIn ? data.lastCheckIn.toDate() : null;
  const streak = data.streakCount || 0;

  let newStreak = streak;

  // ------------------------------------
  // FIRST CHECK-IN EVER
  // ------------------------------------
  if (lastCheckIn === null) {
    newStreak = 1;

    await updateDoc(userRef, {
      streakCount: newStreak,
      lastCheckIn: Timestamp.now(),
    });

    return { rewarded: false, streak: newStreak };
  }

  // ------------------------------------
  // CALCULATE DAY DIFFERENCE
  // ------------------------------------
  const dayDiff =
    Math.floor((today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));

  // Already checked in today → no update
  if (dayDiff < 1) {
    return { rewarded: false, streak };
  }

  // ------------------------------------
  // STREAK PROGRESSION
  // ------------------------------------
  if (dayDiff === 1) {
    newStreak = streak + 1;
  } else {
    newStreak = 1; // Missed days → reset
  }

  // ------------------------------------
  // 7-DAY STREAK COMPLETED
  // Option C: Reward + Reset to 0, but today NOT counted
  // ------------------------------------
  if (newStreak >= 7) {
    await updateDoc(userRef, {
      bonusBalance: increment(10),
      streakCount: 0,
      lastCheckIn: Timestamp.now(),
    });

    return { rewarded: true, streak: 0 };
  }

  // ------------------------------------
  // NORMAL UPDATE (NOT DAY 7)
  // ------------------------------------
  await updateDoc(userRef, {
    streakCount: newStreak,
    lastCheckIn: Timestamp.now(),
  });

  return { rewarded: false, streak: newStreak };
}

// ---------------------------------------------------------
// Other reward functions (unchanged)
// ---------------------------------------------------------

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
