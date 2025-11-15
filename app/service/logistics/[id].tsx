import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    RadioButton,
    Text,
    TextInput,
} from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { useSecureAction } from "../../../hooks/useSecureAction";
import { db } from "../../../lib/firebase";
import PinDialog from "../../components/security/PinDialog";

const PRIMARY_COLOR = "#0A84FF";
const BACKGROUND_COLOR = "#FFFFFF";

export default function LogisticsDetails() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { userProfile, refreshBalance } = useApp();
  const { secureAction, showPinDialog, setShowPinDialog, verifyPin } = useSecureAction();

  const idStr = Array.isArray(params.id) ? params.id[0] : params.id;
  const nameStr = Array.isArray(params.name) ? params.name[0] : params.name;

  const [logistics, setLogistics] = useState<any>(
    nameStr
      ? { id: idStr, name: nameStr, thumbnail: params.thumbnail, description: params.description }
      : null
  );
  const [loading, setLoading] = useState(!nameStr);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [packageWeight, setPackageWeight] = useState("");
  const [packageImage, setPackageImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [vehicleType, setVehicleType] = useState<"bike" | "car" | "van" | null>(null);
  const [shippingType, setShippingType] = useState<"city" | "state" | "outstate">("city");
  const [requestStatus, setRequestStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [adminPhone, setAdminPhone] = useState<string | null>(null);

  const vehicleOptions: ("bike" | "car" | "van")[] = ["bike", "car", "van"];
  const shippingOptions = [
    { label: "Within City", value: "city" },
    { label: "Within State", value: "state" },
    { label: "Outside State", value: "outstate" },
  ];

  useEffect(() => {
    const fetchLogistics = async () => {
      if (!idStr) return;
      try {
        const snap = await getDoc(doc(db, "logistics_points", idStr));
        if (snap.exists()) setLogistics({ id: snap.id, ...snap.data() });
        else {
          Alert.alert("Error", "Logistics service not found");
          router.back();
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to load logistics details");
      } finally {
        setLoading(false);
      }
    };

    if (!nameStr) fetchLogistics();
  }, [idStr]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission denied", "Cannot access gallery");

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPackageImage(result.assets[0].uri);
    }
  };

  const handleRequest = async () => {
    if (!user) return Alert.alert("Login Required", "Please sign in first.");
    if (!pickup.trim() || !destination.trim())
      return Alert.alert("Missing Fields", "Enter pickup and destination.");
    if (!vehicleType) return Alert.alert("Select Vehicle", "Please choose a vehicle type.");
    if (!packageWeight.trim()) return Alert.alert("Missing Info", "Enter package weight.");

    try {
      setProcessing(true);

      const orderRef = await addDoc(collection(db, "logistics_orders"), {
        logisticsId: logistics.id,
        buyerId: user.uid,
        buyerName: userProfile?.fullName || "Anonymous",
        logisticsName: logistics.name,
        pickup,
        destination,
        vehicleType,
        packageWeight,
        packageImage: packageImage || null,
        shippingType,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Simulate admin phone retrieval
      setAdminPhone("+2348012345678");
      setRequestStatus("pending");

      Alert.alert(
        "Request Sent",
        `Your logistics request has been sent. Admin will approve or reject.\n\nContact: ${adminPhone}`
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not send request. Try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestSecure = () => secureAction(() => handleRequest());

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
      </View>
    );

  if (!logistics) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
        <Card style={styles.card}>
          {logistics.thumbnail ? (
            <Image source={{ uri: logistics.thumbnail }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={{ color: "#fff", fontSize: 28 }}>🚚</Text>
            </View>
          )}
          <Card.Content>
            <Text style={styles.name}>{logistics.name}</Text>
            <Text style={styles.desc}>{logistics.description}</Text>
          </Card.Content>
        </Card>

        {/* Pickup and destination */}
        <View style={styles.section}>
          <Text style={styles.label}>Pickup Location</Text>
          <TextInput mode="outlined" placeholder="Enter pickup address" value={pickup} onChangeText={setPickup} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Destination</Text>
          <TextInput mode="outlined" placeholder="Enter destination address" value={destination} onChangeText={setDestination} />
        </View>

        {/* Package weight */}
        <View style={styles.section}>
          <Text style={styles.label}>Package Weight (kg)</Text>
          <TextInput mode="outlined" keyboardType="numeric" placeholder="e.g. 5" value={packageWeight} onChangeText={setPackageWeight} />
        </View>

        {/* Package image */}
        <View style={styles.section}>
          <Text style={styles.label}>Package Image (optional)</Text>
          <Button mode="outlined" onPress={pickImage}>Upload Image</Button>
          {packageImage && <Image source={{ uri: packageImage }} style={{ width: "100%", height: 200, marginTop: 10 }} />}
        </View>

        {/* Vehicle type */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Vehicle Type</Text>
          <View style={styles.vehicleRow}>
            {vehicleOptions.map((v) => (
              <Button
                key={v}
                mode={vehicleType === v ? "contained" : "outlined"}
                onPress={() => setVehicleType(v)}
                style={{ flex: 1, marginHorizontal: 5 }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Button>
            ))}
          </View>
        </View>

        {/* Shipping type */}
        <View style={styles.section}>
          <Text style={styles.label}>Shipping Type</Text>
          <RadioButton.Group
            onValueChange={(value) => setShippingType(value as "city" | "state" | "outstate")}
            value={shippingType}
          >
            {shippingOptions.map((opt) => (
              <View key={opt.value} style={{ flexDirection: "row", alignItems: "center", marginVertical: 4 }}>
                <RadioButton value={opt.value} />
                <Text>{opt.label}</Text>
              </View>
            ))}
          </RadioButton.Group>
        </View>

        {/* Request button */}
        <Button
          mode="contained"
          loading={processing}
          disabled={processing || !vehicleType}
          onPress={handleRequestSecure}
          style={styles.checkoutBtn}
        >
          Request
        </Button>

        {requestStatus === "pending" && adminPhone && (
          <View style={{ marginTop: 16 }}>
            <Text>Request pending. Contact admin for updates: {adminPhone}</Text>
          </View>
        )}

        <PinDialog visible={showPinDialog} onClose={() => setShowPinDialog(false)} onSubmit={verifyPin} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { marginBottom: 16 },
  image: { width: "100%", height: 200, borderRadius: 8 },
  placeholder: { backgroundColor: PRIMARY_COLOR, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 22, fontWeight: "700", marginTop: 8 },
  desc: { color: "#666", marginVertical: 6 },
  section: { marginVertical: 10 },
  label: { fontWeight: "600", marginBottom: 8, fontSize: 16 },
  vehicleRow: { flexDirection: "row", justifyContent: "space-between" },
  checkoutBtn: { marginTop: 20, backgroundColor: PRIMARY_COLOR },
});
