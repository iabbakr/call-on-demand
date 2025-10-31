import {
  addDoc,
  collection,
  getDocs,
  query,
  QueryConstraint,
  where
} from "firebase/firestore";
import { db } from "./firebase";

interface NotificationData {
  title: string;
  body: string;
  data?: any;
  scheduleAt?: Date; // optional scheduling
}

interface UserFilter {
  state?: string;
  city?: string;
  role?: string;
}

/**
 * Send a single Expo push notification
 */
const sendExpoNotification = async (
  expoPushToken: string,
  { title, body, data }: NotificationData
) => {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data,
      }),
    });
  } catch (err) {
    console.error(`Failed to send push to ${expoPushToken}:`, err);
    throw err;
  }
};

/**
 * Send notifications to users with optional filters, logging, and retry
 */
export const notifyUsers = async (
  filters: UserFilter = {},
  notification: NotificationData,
  maxRetries = 3
) => {
  try {
    // Build query constraints
    const constraints: QueryConstraint[] = [];
    if (filters.state) constraints.push(where("state", "==", filters.state));
    if (filters.city) constraints.push(where("city", "==", filters.city));
    if (filters.role) constraints.push(where("role", "==", filters.role));

    const usersRef = collection(db, "users");
    const usersQuery = constraints.length > 0 ? query(usersRef, ...constraints) : usersRef;

    const usersSnap = await getDocs(usersQuery);

    const notificationsPromises = usersSnap.docs
      .map((doc) => doc.data())
      .filter((user: any) => user.expoPushToken)
      .map(async (user: any) => {
        let attempt = 0;
        while (attempt < maxRetries) {
          try {
            await sendExpoNotification(user.expoPushToken, notification);
            break; // success, exit loop
          } catch (err) {
            attempt++;
            if (attempt >= maxRetries) {
              console.error(`Failed to notify ${user.id} after ${maxRetries} attempts.`);
            }
          }
        }

        // Log notification in Firestore
        await addDoc(collection(db, "notifications"), {
          userId: user.id,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sentAt: new Date(),
        });
      });

    await Promise.all(notificationsPromises);
    console.log(`Notifications sent to ${notificationsPromises.length} users.`);
  } catch (err) {
    console.error("Failed to notify users:", err);
  }
};

/**
 * Example usage:
 */

// Global notification
// notifyUsers({}, { title: "Hello", body: "Global update for all users" });

// Notification to Lagos users only
// notifyUsers({ state: "Lagos" }, { title: "Promo", body: "Special Lagos discount!" });

// Notification to admins
// notifyUsers({ role: "admin" }, { title: "Admin Alert", body: "New food item added!" });
