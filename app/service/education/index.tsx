import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import { useAuth } from "../../../context/AuthContext";
import { buyEducation } from "../../../lib/api";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";

const services = [
  { id: "jamb", name: "JAMB Pin", icon: "📝", price: 3500, description: "Joint Admissions & Matriculation Board" },
  { id: "waec", name: "WAEC Pin", icon: "📚", price: 2500, description: "West African Examinations Council" },
  { id: "neco", name: "NECO Pin", icon: "✍️", price: 1000, description: "National Examinations Council" },
];

export default function EducationPage() {
  const { user } = useAuth();
  const { balance: globalBalance, deductBalance, addTransaction } = useApp();
  const [balance, setBalance] = useState<number>(0);
  const [service, setService] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setBalance(globalBalance || 0);
    setInitialLoading(false);
  }, [globalBalance]);

  const selectedService = services.find((s) => s.id === service);
  const qty = parseInt(quantity || "0", 10);
  const total = selectedService ? qty * selectedService.price : 0;
  const canPurchase = service && qty >= 1 && total <= balance;

  const handleBuy = async () => {
    setLoading(true);
    try {
      if (!service) throw new Error("Select an education service");
      if (isNaN(qty) || qty < 1) throw new Error("Enter a valid quantity (minimum 1)");
      if (total > balance) throw new Error("Insufficient balance");

      const res = await buyEducation({
        serviceID: service,
        quantity: qty,
        amount: total,
        phone: user?.phoneNumber || "08011111111",
      });

      if (!res || !res.success) throw new Error(res.response_description || "Transaction failed");

      await deductBalance(total, `Purchased ${qty} ${service.toUpperCase()} pin(s)`, "Education");
      await addTransaction({
        description: `Education purchase ${service.toUpperCase()} x${qty}`,
        amount: total,
        type: "debit",
        category: "Education",
        status: "success",
      });

      Alert.alert(
        "✅ Success", 
        `Successfully purchased ${qty} ${service.toUpperCase()} pin(s).\n\nPins will be sent to your email.`
      );
      setService("");
      setQuantity("1");
      router.back();
    } catch (err: any) {
      console.error("education:", err);
      Alert.alert("❌ Error", err?.message || "Failed to purchase");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={PRIMARY_COLOR} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🎓 Education</Text>
          <Text style={styles.headerSubtitle}>Purchase exam pins instantly</Text>
        </View>
      </View>

      {/* Balance Card */}
      <Card style={styles.balanceCard}>
        <Card.Content>
          <View style={styles.balanceContent}>
            <View>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <View style={styles.balanceRow}>
                <FontAwesome5 name="wallet" size={20} color={BACKGROUND_COLOR} />
                <Text style={styles.balanceAmount}>₦{balance.toLocaleString()}</Text>
              </View>
            </View>
            <Pressable 
              onPress={() => router.push("/wallet/add-funds")}
              style={styles.topUpButton}
            >
              <FontAwesome5 name="plus-circle" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.topUpText}>Top Up</Text>
            </Pressable>
          </View>
        </Card.Content>
      </Card>

      {/* Service Selection */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionLabel}>📋 Select Exam Board</Text>
          <View style={styles.servicesContainer}>
            {services.map((s) => {
              const isSelected = service === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setService(s.id)}
                  style={[
                    styles.serviceCard,
                    isSelected && styles.serviceCardSelected,
                  ]}
                >
                  <Text style={styles.serviceIcon}>{s.icon}</Text>
                  <View style={styles.serviceInfo}>
                    <Text style={[
                      styles.serviceName,
                      isSelected && styles.serviceNameSelected,
                    ]}>
                      {s.name}
                    </Text>
                    <Text style={styles.serviceDescription} numberOfLines={2}>
                      {s.description}
                    </Text>
                    <View style={styles.servicePriceRow}>
                      <Text style={[
                        styles.servicePrice,
                        isSelected && { color: PRIMARY_COLOR }
                      ]}>
                        ₦{s.price.toLocaleString()}
                      </Text>
                      <Text style={styles.servicePer}>per pin</Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <FontAwesome5 name="check" size={12} color={BACKGROUND_COLOR} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      {/* Quantity Selection */}
      {selectedService && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionLabel}>🔢 Quantity</Text>
            <TextInput
              mode="outlined"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Enter quantity"
              style={styles.input}
              left={<TextInput.Icon icon="pound" />}
              right={
                qty > 0 ? (
                  <TextInput.Icon icon="check-circle" color={SUCCESS_COLOR} />
                ) : null
              }
            />
            {qty > 0 && qty < 1 && (
              <Text style={styles.errorText}>Minimum quantity is 1</Text>
            )}

            {/* Quick Quantity Selection */}
            <View style={styles.quickQuantityContainer}>
              <Text style={styles.quickQuantityLabel}>Quick select:</Text>
              <View style={styles.quickQuantityRow}>
                {[1, 2, 3, 5, 10].map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => setQuantity(q.toString())}
                    style={[
                      styles.quickQuantityBtn,
                      quantity === q.toString() && styles.quickQuantityBtnSelected,
                    ]}
                  >
                    <Text style={[
                      styles.quickQuantityText,
                      quantity === q.toString() && styles.quickQuantityTextSelected,
                    ]}>
                      {q}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Price Breakdown */}
            {qty > 0 && (
              <Card style={styles.breakdownCard}>
                <Card.Content>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Unit Price:</Text>
                    <Text style={styles.breakdownValue}>
                      ₦{selectedService.price.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Quantity:</Text>
                    <Text style={styles.breakdownValue}>×{qty}</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                    <Text style={styles.breakdownTotalLabel}>Total:</Text>
                    <Text style={styles.breakdownTotalValue}>
                      ₦{total.toLocaleString()}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Purchase Summary */}
      {canPurchase && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>📋 Purchase Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service:</Text>
              <Text style={styles.summaryValue}>{selectedService?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Quantity:</Text>
              <Text style={styles.summaryValue}>{qty} pin(s)</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
              <Text style={styles.summaryTotalValue}>
                ₦{total.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Balance After:</Text>
              <Text style={[styles.summaryValue, { color: SUCCESS_COLOR, fontWeight: "bold" }]}>
                ₦{(balance - total).toLocaleString()}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Purchase Button */}
      <Button
        mode="contained"
        onPress={handleBuy}
        disabled={loading || !canPurchase}
        loading={loading}
        style={styles.purchaseButton}
        contentStyle={styles.purchaseButtonContent}
        icon="shopping"
      >
        {loading ? "Processing..." : `Purchase for ₦${total.toLocaleString()}`}
      </Button>

      {/* Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoRow}>
            <FontAwesome5 name="envelope" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.infoText}>Pins delivered via email instantly</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="shield-alt" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.infoText}>Secure transaction processing</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="history" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.infoText}>View purchase history anytime</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  balanceCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: PRIMARY_COLOR,
    elevation: 4,
  },
  balanceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceAmount: {
    color: BACKGROUND_COLOR,
    fontSize: 24,
    fontWeight: "bold",
  },
  topUpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BACKGROUND_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topUpText: {
    color: PRIMARY_COLOR,
    fontWeight: "600",
    fontSize: 13,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  servicesContainer: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  serviceCardSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: ACCENT_COLOR,
  },
  serviceIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  serviceNameSelected: {
    color: PRIMARY_COLOR,
  },
  serviceDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  servicePriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  servicePer: {
    fontSize: 12,
    color: "#999",
  },
  selectedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: SUCCESS_COLOR,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    backgroundColor: BACKGROUND_COLOR,
    marginBottom: 8,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginBottom: 8,
  },
  quickQuantityContainer: {
    marginTop: 8,
  },
  quickQuantityLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  quickQuantityRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickQuantityBtn: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  quickQuantityBtnSelected: {
    backgroundColor: ACCENT_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  quickQuantityText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  quickQuantityTextSelected: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
  },
  breakdownCard: {
    marginTop: 16,
    backgroundColor: "#F8F9FA",
    elevation: 0,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#666",
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  breakdownTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  breakdownTotalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
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
  },
  summaryTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  purchaseButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
  },
  purchaseButtonContent: {
    paddingVertical: 8,
  },
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: "#E8F5E9",
    elevation: 0,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
});