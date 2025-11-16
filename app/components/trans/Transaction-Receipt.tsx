// Transaction-Receipt.tsx - Styled Version
import { db } from "@/lib/firebase";
import { FontAwesome5 } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, Chip, Text } from "react-native-paper";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const BACKGROUND_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const ERROR_COLOR = "#F44336";
const WARNING_COLOR = "#FF9800";
const SCREEN_BG = "#F5F5F5";

export default function TransactionReceipt() {
  const { id } = useLocalSearchParams();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchTransaction = async () => {
      try {
        const snap = await getDoc(doc(db, "transactions", String(id)));
        if (!snap.exists()) {
          setTransaction(null);
          return;
        }

        const data = snap.data();

        const getUserName = async (uid: string | undefined) => {
          if (!uid) return "Unknown";
          try {
            const userSnap = await getDoc(doc(db, "users", uid));
            return userSnap.exists()
              ? (userSnap.data() as any).fullName || "Unknown"
              : "Unknown";
          } catch {
            return "Unknown";
          }
        };

        const senderName =
          data.senderName ||
          (data.senderId ? await getUserName(data.senderId) : "Unknown");
        const receiverName =
          data.receiverName ||
          (data.receiverId ? await getUserName(data.receiverId) : "Unknown");

        setTransaction({ ...data, senderName, receiverName });
      } catch (err) {
        console.error("Error fetching receipt:", err);
        setTransaction(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [id]);

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "success" || s === "successful") return SUCCESS_COLOR;
    if (s === "failed" || s === "error") return ERROR_COLOR;
    if (s === "pending") return WARNING_COLOR;
    return "#999";
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "success" || s === "successful") return "check-circle";
    if (s === "failed" || s === "error") return "times-circle";
    if (s === "pending") return "clock";
    return "info-circle";
  };

  const handlePrint = async () => {
    if (!transaction) return;

    const statusColor = getStatusColor(transaction.status);

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              color: #333; 
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              border-bottom: 3px solid ${PRIMARY_COLOR};
              padding-bottom: 20px;
            }
            .header h1 { 
              color: ${PRIMARY_COLOR}; 
              margin: 0; 
              font-size: 28px;
            }
            .header p { 
              color: #666; 
              margin-top: 8px; 
            }
            .receipt-box { 
              border: 2px solid #E0E0E0; 
              border-radius: 12px; 
              padding: 24px; 
            }
            .row { 
              display: flex; 
              justify-content: space-between; 
              padding: 12px 0; 
              border-bottom: 1px solid #F0F0F0; 
            }
            .row:last-child { 
              border-bottom: none; 
            }
            .label { 
              color: #666; 
              font-weight: 500; 
            }
            .value { 
              font-weight: 600; 
              color: #333; 
              text-align: right;
            }
            .amount-section {
              background: ${ACCENT_COLOR};
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
            }
            .amount { 
              font-size: 32px; 
              font-weight: bold; 
              color: ${PRIMARY_COLOR}; 
            }
            .status { 
              display: inline-block; 
              padding: 6px 16px; 
              border-radius: 20px; 
              background: ${statusColor}20; 
              color: ${statusColor}; 
              font-weight: 600; 
            }
            .footer { 
              text-align: center; 
              margin-top: 40px; 
              padding-top: 20px;
              border-top: 2px solid #E0E0E0;
              color: #999; 
              font-size: 12px; 
            }
            .transaction-id {
              background: #F5F5F5;
              padding: 12px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 12px;
              word-break: break-all;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Transaction Receipt</h1>
            <p>Official payment confirmation</p>
          </div>
          
          <div class="receipt-box">
            <div class="row">
              <span class="label">Transaction ID</span>
            </div>
            <div class="transaction-id">${String(id)}</div>
            
            <div class="amount-section">
              <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Amount</div>
              <div class="amount">₦${transaction.amount?.toLocaleString()}</div>
            </div>
            
            <div class="row">
              <span class="label">Status</span>
              <span class="status">${transaction.status || "Pending"}</span>
            </div>
            <div class="row">
              <span class="label">Type</span>
              <span class="value">${transaction.type || "—"}</span>
            </div>
            <div class="row">
              <span class="label">Category</span>
              <span class="value">${transaction.category || "—"}</span>
            </div>
            <div class="row">
              <span class="label">From</span>
              <span class="value">${transaction.senderName}</span>
            </div>
            <div class="row">
              <span class="label">To</span>
              <span class="value">${transaction.receiverName}</span>
            </div>
            <div class="row">
              <span class="label">Date & Time</span>
              <span class="value">${
                transaction.createdAt?.seconds
                  ? new Date(
                      transaction.createdAt.seconds * 1000
                    ).toLocaleString()
                  : "—"
              }</span>
            </div>
            ${
              transaction.reference
                ? `<div class="row">
                     <span class="label">Reference</span>
                     <span class="value">${transaction.reference}</span>
                   </div>`
                : ""
            }
          </div>
          
          <div class="footer">
            <p><strong>Thank you for using our service</strong></p>
            <p>This is an automatically generated receipt.</p>
            <p>For any inquiries, please contact support.</p>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.error("Error printing/sharing receipt:", err);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "Transaction Receipt",
            headerStyle: { backgroundColor: PRIMARY_COLOR },
            headerTintColor: "#fff",
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading receipt...</Text>
        </View>
      </>
    );
  }

  if (!transaction) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "Transaction Receipt",
            headerStyle: { backgroundColor: PRIMARY_COLOR },
            headerTintColor: "#fff",
          }}
        />
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="file-alt" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>Receipt Not Found</Text>
          <Text style={styles.emptyText}>
            This transaction receipt could not be loaded.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Go Back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const statusColor = getStatusColor(transaction.status);
  const statusIcon = getStatusIcon(transaction.status);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Transaction Receipt",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View
            style={[
              styles.successIcon,
              { backgroundColor: statusColor + "20" },
            ]}
          >
            <FontAwesome5 name={statusIcon} size={48} color={statusColor} />
          </View>
          <Chip
            style={[styles.statusChip, { backgroundColor: statusColor + "20" }]}
            textStyle={[styles.statusChipText, { color: statusColor }]}
          >
            {transaction.status || "Pending"}
          </Chip>
          <Text style={styles.successAmount}>
            ₦{transaction.amount?.toLocaleString() || "0"}
          </Text>
        </View>

        {/* Transaction Details Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Transaction Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Transaction ID</Text>
              <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
                {String(id).slice(0, 16).toUpperCase()}...
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{transaction.type || "—"}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.value}>{transaction.category || "—"}</Text>
            </View>

            {transaction.description && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.value} numberOfLines={2}>
                  {transaction.description}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Party Information Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Party Information</Text>

            <View style={styles.partyRow}>
              <View style={styles.partyIconContainer}>
                <FontAwesome5 name="user" size={16} color={PRIMARY_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.partyLabel}>From</Text>
                <Text style={styles.partyValue} numberOfLines={1}>
                  {transaction.senderName}
                </Text>
              </View>
            </View>

            <View style={styles.arrowContainer}>
              <FontAwesome5 name="arrow-down" size={16} color="#999" />
            </View>

            <View style={styles.partyRow}>
              <View style={styles.partyIconContainer}>
                <FontAwesome5 name="user-check" size={16} color={SUCCESS_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.partyLabel}>To</Text>
                <Text style={styles.partyValue} numberOfLines={1}>
                  {transaction.receiverName}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Metadata Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Additional Information</Text>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Date & Time</Text>
              <Text style={styles.value}>
                {transaction.createdAt?.seconds
                  ? new Date(
                      transaction.createdAt.seconds * 1000
                    ).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </Text>
            </View>

            {transaction.reference && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Reference</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {transaction.reference}
                </Text>
              </View>
            )}

            {transaction.metadata && (
              <>
                {transaction.metadata.network && (
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Network</Text>
                    <Text style={styles.value}>
                      {transaction.metadata.network.toUpperCase()}
                    </Text>
                  </View>
                )}
                {transaction.metadata.phoneNumber && (
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Phone Number</Text>
                    <Text style={styles.value}>
                      {transaction.metadata.phoneNumber}
                    </Text>
                  </View>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable onPress={handlePrint} style={styles.shareButton}>
            <FontAwesome5 name="share-alt" size={18} color={PRIMARY_COLOR} />
            <Text style={styles.shareButtonText}>Share Receipt</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <FontAwesome5 name="info-circle" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.infoTitle}>Receipt Information</Text>
            </View>
            <Text style={styles.infoText}>
              This is an official transaction receipt. Keep it for your records. You
              can share this receipt via the button above.
            </Text>
          </Card.Content>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: SCREEN_BG,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
  },

  // Success Header
  successHeader: {
    backgroundColor: PRIMARY_COLOR,
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  statusChip: {
    marginBottom: 16,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  successAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFF",
  },

  // Cards
  card: {
    margin: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Detail Rows
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  label: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },

  // Party Information
  partyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: ACCENT_COLOR,
    padding: 16,
    borderRadius: 12,
  },
  partyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BACKGROUND_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  partyLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  partyValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  arrowContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },

  // Action Buttons
  actionButtons: {
    paddingHorizontal: 16,
    gap: 12,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BACKGROUND_COLOR,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    elevation: 2,
  },
  shareButtonText: {
    color: PRIMARY_COLOR,
    fontWeight: "600",
    fontSize: 15,
  },
  doneButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
  },
  doneButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
  },

  // Info Card
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
    elevation: 0,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  infoText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
});