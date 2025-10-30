/**
 * seedServices.ts
 * 
 * Run this once to seed Firestore with sample Nigerian service data.
 * 
 * Usage:
 *   npx ts-node seedServices.ts
 */


// firebase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getFirestore, collection,
  addDoc } from "firebase/firestore";

// Use dynamic import to avoid TypeScript issues
const { initializeAuth, getReactNativePersistence } = require("firebase/auth");

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

// Example services
const services = [
  // 🧺 Laundry
  {
    name: "Swift Laundry",
    category: "laundry",
    state: "Lagos",
    price: 2500,
    currency: "NGN",
    rating: 4.7,
    thumbnail: "https://placehold.co/300x200?text=Swift+Laundry",
    description: "Affordable same-day laundry pickup and delivery in Lagos.",
    tags: ["wash", "delivery", "cleaning"],
  },
  {
    name: "CleanWave Laundry",
    category: "laundry",
    state: "Abuja",
    price: 3000,
    rating: 4.5,
    description: "Premium dry cleaning and ironing services.",
    thumbnail: "https://placehold.co/300x200?text=CleanWave",
  },

  // 🍛 Food
  {
    name: "ChopLife Restaurant",
    category: "food",
    state: "Abuja",
    price: 1800,
    rating: 4.6,
    thumbnail: "https://placehold.co/300x200?text=ChopLife",
    description: "Delicious Nigerian meals, delivered fast.",
    tags: ["rice", "egusi", "delivery"],
  },
  {
    name: "Mama Put Deluxe",
    category: "food",
    state: "Lagos",
    price: 1200,
    rating: 4.3,
    thumbnail: "https://placehold.co/300x200?text=Mama+Put",
    description: "Authentic homemade meals at your doorstep.",
  },

  // 🏨 Hotels
  {
    name: "Royal Suites",
    category: "hotel",
    state: "Enugu",
    price: 25000,
    rating: 4.3,
    thumbnail: "https://placehold.co/300x200?text=Royal+Suites",
    description: "Luxury stay in the heart of Enugu.",
  },
  {
    name: "GreenPark Hotel",
    category: "hotel",
    state: "Lagos",
    price: 18000,
    rating: 4.1,
    thumbnail: "https://placehold.co/300x200?text=GreenPark",
    description: "Affordable comfort and style.",
  },

  // 🚗 Transport
  {
    name: "CityRides",
    category: "transport",
    state: "Kano",
    price: 1500,
    rating: 4.2,
    thumbnail: "https://placehold.co/300x200?text=CityRides",
    description: "Intra-city rides and inter-state trips.",
  },
  {
    name: "QuickMove Transport",
    category: "transport",
    state: "Niger",
    price: 2200,
    rating: 4.5,
    thumbnail: "https://placehold.co/300x200?text=QuickMove",
    description: "Affordable and reliable city transport service.",
  },

  // 📦 Logistics
  {
    name: "SpeedDrop Logistics",
    category: "logistics",
    state: "Niger",
    price: 2000,
    rating: 4.8,
    thumbnail: "https://placehold.co/300x200?text=SpeedDrop",
    description: "Door-to-door parcel delivery in Lagos.",
    tags: ["delivery", "parcel", "courier"],
  },
  {
    name: "NaijaExpress Courier",
    category: "logistics",
    state: "Abuja",
    price: 2500,
    rating: 4.6,
    thumbnail: "https://placehold.co/300x200?text=NaijaExpress",
    description: "Nationwide courier and express delivery.",
  },
];

async function seed() {
  console.log("🚀 Seeding services into Firestore...");
  const ref = collection(db, "services");

  for (const s of services) {
    await addDoc(ref, s);
    console.log(`✅ Added: ${s.name} (${s.category})`);
  }

  console.log("🎉 Done! All demo services have been added.");
}

seed().catch(console.error);
