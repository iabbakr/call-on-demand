// logistics/[id].tsx - Improved Styling
import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  Text,
  TextInput
} from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { useSecureAction } from "../../../hooks/useSecureAction";
import { db } from "../../../lib/firebase";
import PinDialog from "../../components/security/PinDialog";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const SCREEN_BG = "#F5F5F5";

const { width } = Dimensions.get("window");

type VehicleType = "bike" | "car" | "van";
type ShippingType = "city" | "state" | "outstate";

const vehicleOptions = [
  { value: "bike" as VehicleType, label: "Bike", icon: "motorcycle", capacity: "Up to 10kg" },
  { value: "car" as VehicleType, label: "Car", icon: "car", capacity: "Up to 50kg" },
  { value: "van" as VehicleType, label: "Van", icon: "truck", capacity: "Up to 500kg" },
];

const shippingOptions = [
  { value: "city" as ShippingType, label: "Within City", icon: "city", description: "Same day delivery" },
  { value: "state" as ShippingType, label: "Within State", icon: "map", description: "1-2 days delivery" },
  { value: "outstate" as ShippingType, label: "Outside State", icon: "map-marked-alt", description: "3-5 days delivery" },
];

export default function LogisticsDetails() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { userProfile } = useApp();
  const { secureAction, showPinDialog, setShowPinDialog, verifyPin } = useSecureAction();

  const idStr = Array.isArray(params.id) ? params.id[0] : params.id;

  const [logistics, setLogistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [packageWeight, setPackageWeight] = useState("");
  const [packageImage, setPackageImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [shippingType, setShippingType] = useState<ShippingType>("city");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const fetchLogistics = async () => {
      if (!idStr) return;
      try {
        const snap = await getDoc(doc(db, "logistics_points", idStr));
        if (snap.exists()) {
          setLogistics({ id: snap.id, ...snap.data() });
        } else {
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

    fetchLogistics();
  }, [idStr]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert("Permission denied", "Cannot access gallery");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPackageImage(result.assets[0].uri);
    }
  };

  const handleRequest = async () => {
    if (!user) return Alert.alert("Login Required", "Please sign in first.");
    if (!pickup.trim() || !destination.trim())
      return Alert.alert("Missing Fields", "Enter pickup and destination addresses.");
    if (!vehicleType) return Alert.alert("Select Vehicle", "Please choose a vehicle type.");
    if (!packageWeight.trim())
      return Alert.alert("Missing Info", "Enter package weight.");

    const weight = parseFloat(packageWeight);
    if (isNaN(weight) || weight <= 0) {
      return Alert.alert("Invalid Weight", "Enter a valid package weight.");
    }

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
        packageWeight: weight,
        packageImage: packageImage || null,
        shippingType,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "✅ Request Sent",
        `Your logistics request has been sent successfully!\n\nOrder ID: ${orderRef.id.slice(0, 8).toUpperCase()}\n\nThe logistics provider will contact you shortly.`,
        [
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]
      );

      // Reset form
      setPickup("");
      setDestination("");
      setPackageWeight("");
      setPackageImage(null);
      setVehicleType(null);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not send request. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestSecure = () => secureAction(() => handleRequest());

  const canRequest =
    pickup.trim() &&
    destination.trim() &&
    vehicleType &&
    packageWeight.trim() &&
    parseFloat(packageWeight) > 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading logistics details...</Text>
      </View>
    );
  }

  if (!logistics) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: logistics.name || "Logistics Details",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerBackVisible: true,
        }}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          {logistics.thumbnail ? (
            <Image source={{ uri: logistics.thumbnail }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <FontAwesome5 name="truck" size={64} color="#FFF" />
            </View>
          )}

          {logistics.rating && (
            <View style={styles.ratingBadge}>
              <FontAwesome5 name="star" size={16} color="#FFB800" solid />
              <Text style={styles.ratingText}>{logistics.rating}</Text>
            </View>
          )}
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.logisticsName}>{logistics.name}</Text>

            {logistics.address && (
              <View style={styles.infoRow}>
                <FontAwesome5 name="map-marker-alt" size={14} color="#666" />
                <Text style={styles.infoText}>{logistics.address}</Text>
              </View>
            )}

            {logistics.phone && (
              <View style={styles.infoRow}>
                <FontAwesome5 name="phone" size={14} color="#666" />
                <Text style={styles.infoText}>{logistics.phone}</Text>
              </View>
            )}

            {logistics.description && (
              <Text style={styles.description}>{logistics.description}</Text>
            )}
          </Card.Content>
        </Card>

        {/* Addresses */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Delivery Addresses</Text>

            <Text style={styles.inputLabel}>Pickup Location</Text>
            <TextInput
              mode="outlined"
              placeholder="Enter pickup address"
              value={pickup}
              onChangeText={setPickup}
              style={styles.input}
              left={<TextInput.Icon icon="map-marker" />}
            />

            <Text style={styles.inputLabel}>Destination</Text>
            <TextInput
              mode="outlined"
              placeholder="Enter destination address"
              value={destination}
              onChangeText={setDestination}
              style={styles.input}
              left={<TextInput.Icon icon="map-marker-alt" />}
            />
          </Card.Content>
        </Card>

        {/* Shipping Type */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Shipping Type</Text>

            <View style={styles.shippingGrid}>
              {shippingOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setShippingType(option.value)}
                  style={[
                    styles.shippingCard,
                    shippingType === option.value && styles.shippingCardActive,
                  ]}
                >
                  <View
                    style={[
                      styles.shippingIcon,
                      shippingType === option.value && styles.shippingIconActive,
                    ]}
                  >
                    <FontAwesome5
                      name={option.icon}
                      size={20}
                      color={shippingType === option.value ? PRIMARY_COLOR : "#666"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.shippingLabel,
                      shippingType === option.value && styles.shippingLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.shippingDescription}>{option.description}</Text>
                  {shippingType === option.value && (
                    <View style={styles.selectedBadge}>
                      <FontAwesome5 name="check" size={10} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Vehicle Type */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Select Vehicle Type</Text>

            <View style={styles.vehicleGrid}>
              {vehicleOptions.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.value}
                  onPress={() => setVehicleType(vehicle.value)}
                  style={[
                    styles.vehicleCard,
                    vehicleType === vehicle.value && styles.vehicleCardActive,
                  ]}
                >
                  <View
                    style={[
                      styles.vehicleIcon,
                      vehicleType === vehicle.value && styles.vehicleIconActive,
                    ]}
                  >
                    <FontAwesome5
                      name={vehicle.icon}
                      size={28}
                      color={vehicleType === vehicle.value ? PRIMARY_COLOR : "#666"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.vehicleLabel,
                      vehicleType === vehicle.value && styles.vehicleLabelActive,
                    ]}
                  >
                    {vehicle.label}
                  </Text>
                  <Text style={styles.vehicleCapacity}>{vehicle.capacity}</Text>
                  {vehicleType === vehicle.value && (
                    <View style={styles.selectedBadge}>
                      <FontAwesome5 name="check" size={10} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Package Details */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Package Details</Text>

            <Text style={styles.inputLabel}>Package Weight (kg)</Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. 5"
              keyboardType="numeric"
              value={packageWeight}
              onChangeText={setPackageWeight}
              style={styles.input}
              left={<TextInput.Icon icon="weight-kilogram" />}
            />

            <Text style={styles.inputLabel}>Package Image (Optional)</Text>
            <Pressable
              style={styles.uploadButton}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              ) : (
                <>
                  <FontAwesome5
                    name={packageImage ? "image" : "camera"}
                    size={20}
                    color={PRIMARY_COLOR}
                  />
                  <Text style={styles.uploadText}>
                    {packageImage ? "Change Image" : "Upload Package Photo"}
                  </Text>
                </>
              )}
            </Pressable>

            {packageImage && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: packageImage }} style={styles.previewImage} />
                <Pressable
                  style={styles.removeImageBtn}
                  onPress={() => setPackageImage(null)}
                >
                  <FontAwesome5 name="times-circle" size={24} color={ERROR_COLOR} />
                </Pressable>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Summary (if valid) */}
        {canRequest && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.summaryTitle}>Request Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Vehicle:</Text>
                <Chip compact style={styles.summaryChip}>
                  {vehicleOptions.find((v) => v.value === vehicleType)?.label}
                </Chip>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping:</Text>
                <Chip compact style={styles.summaryChip}>
                  {shippingOptions.find((s) => s.value === shippingType)?.label}
                </Chip>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Weight:</Text>
                <Text style={styles.summaryValue}>{packageWeight} kg</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>From:</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {pickup || "—"}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>To:</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {destination || "—"}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Request Button */}
        <Pressable
          style={[styles.requestButton, (!canRequest || processing) && styles.requestButtonDisabled]}
          onPress={handleRequestSecure}
          disabled={!canRequest || processing}
        >
          {processing ? (
            <ActivityIndicator color={BACKGROUND_COLOR} />
          ) : (
            <View style={styles.requestButtonContent}>
              <FontAwesome5 name="paper-plane" size={16} color={BACKGROUND_COLOR} />
              <Text style={styles.requestButtonText}>Send Request</Text>
            </View>
          )}
        </Pressable>

        {/* Info Card */}
        <Card style={styles.infoHelpCard}>
          <Card.Content>
            <View style={styles.infoHelpRow}>
              <FontAwesome5 name="info-circle" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.infoHelpText}>
                The logistics provider will contact you to confirm pickup time and delivery cost.
              </Text>
            </View>
            <View style={styles.infoHelpRow}>
              <FontAwesome5 name="shield-alt" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.infoHelpText}>Secured with PIN verification</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PinDialog
        visible={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onSubmit={verifyPin}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SCREEN_BG,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero Section
  heroContainer: {
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 280,
  },
  heroPlaceholder: {
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  ratingBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },

  // Info Card
  infoCard: {
    margin: 16,
    marginTop: -32,
    borderRadius: 16,
    elevation: 4,
  },
  logisticsName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginTop: 8,
  },

  // Cards
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: BACKGROUND_COLOR,
    marginBottom: 16,
  },

  // Shipping Grid
  shippingGrid: {
    gap: 12,
  },
  shippingCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    position: "relative",
  },
  shippingCardActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: ACCENT_COLOR,
  },
  shippingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  shippingIconActive: {
    backgroundColor: PRIMARY_COLOR + "20",
  },
  shippingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  shippingLabelActive: {
    color: PRIMARY_COLOR,
  },
  shippingDescription: {
    fontSize: 12,
    color: "#666",
  },

  // Vehicle Grid
  vehicleGrid: {
    flexDirection: "row",
    gap: 12,
  },
  vehicleCard: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    position: "relative",
  },
  vehicleCardActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: ACCENT_COLOR,
  },
  vehicleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleIconActive: {
    backgroundColor: PRIMARY_COLOR + "20",
  },
  vehicleLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  vehicleLabelActive: {
    color: PRIMARY_COLOR,
  },
  vehicleCapacity: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: SUCCESS_COLOR,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  // Upload Button
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BACKGROUND_COLOR,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_COLOR,
  },
  imagePreview: {
    position: "relative",
    marginTop: 8,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
  },

  // Summary
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    maxWidth: "60%",
    textAlign: "right",
  },
  summaryChip: {
    backgroundColor: PRIMARY_COLOR + "20",
    height: 28,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },

  // Request Button
  requestButton: {
    backgroundColor: PRIMARY_COLOR,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
  },
  requestButtonDisabled: {
    opacity: 0.5,
  },
  requestButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requestButtonText: {
    color: BACKGROUND_COLOR,
    fontWeight: "700",
    fontSize: 16,
  },

  // Info Help Card
  infoHelpCard: {
    marginHorizontal: 16,
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    elevation: 0,
  },
  infoHelpRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    gap: 12,
  },
  infoHelpText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
});