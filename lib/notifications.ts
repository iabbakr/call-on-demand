import { addDoc, collection, getDocs, query, QueryConstraint, where } from "firebase/firestore";
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

export const notifyUsers = async (
  filters: UserFilter = {},
  notification: NotificationData,
  maxRetries = 3
) => {
  try {
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
        // Schedule notification if needed
        if (notification.scheduleAt && notification.scheduleAt > new Date()) {
          await addDoc(collection(db, "scheduledNotifications"), {
            userId: user.id,
            expoPushToken: user.expoPushToken,
            notification,
            scheduledAt: notification.scheduleAt,
            createdAt: new Date(),
            status: "pending",
          });
        } else {
          // Send immediately
          let attempt = 0;
          while (attempt < maxRetries) {
            try {
              await sendExpoNotification(user.expoPushToken, notification);
              break;
            } catch (err) {
              attempt++;
              if (attempt >= maxRetries) {
                console.error(`Failed to notify ${user.id} after ${maxRetries} attempts.`);
              }
            }
          }
        }

        // Log notification
        await addDoc(collection(db, "notifications"), {
          userId: user.id,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sentAt: notification.scheduleAt ? null : new Date(),
        });
      });

    await Promise.all(notificationsPromises);
    console.log(`Notifications processed for ${notificationsPromises.length} users.`);
  } catch (err) {
    console.error("Failed to notify users:", err);
  }
};
