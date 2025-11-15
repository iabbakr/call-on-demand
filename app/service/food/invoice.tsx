import { FontAwesome5 } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Divider, Text } from "react-native-paper";
import { db } from "../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const SUCCESS_COLOR = "#4CAF50";
const WARNING_COLOR = "#FF9800";
const ERROR_COLOR = "#F44336";

const STATUS_COLORS = {
  pending: WARNING_COLOR,
  processing: "#2196F3",
  completed: SUCCESS_COLOR,
  cancelled: ERROR_COLOR,
};

const STATUS_ICONS = {
  pending: "clock",
  processing: "spinner",
  completed: "check-circle",
  cancelled: "times-circle",
};

export default function InvoiceScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const ref = doc(db, "orders", orderId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() });
        } else {
          Alert.alert("Error", "Order not found.");
        }
      } catch (err) {
        Alert.alert("Error", "Failed to fetch order details.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const formatItems = (items: any[]) =>
    items.length
      ? items
          .map((i) => `${i.name}${i.quantity ? ` (×${i.quantity})` : ""}`)
          .join(", ")
      : "None";

  const formatItemsTable = (items: any[]) => {
    if (!items || items.length === 0) return "<tr><td colspan='3'>None</td></tr>";
    return items
      .map(
        (i) => `
      <tr>
        <td>${i.name}</td>
        <td style="text-align: center;">${i.quantity || 1}</td>
        <td style="text-align: right;">₦${(i.price * (i.quantity || 1)).toLocaleString()}</td>
      </tr>
    `
      )
      .join("");
  };

  const generatePDF = async () => {
    if (!order) return;
    setGenerating(true);

    try {
      const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: ${PRIMARY_COLOR};
              margin-bottom: 5px;
            }
            .tagline {
              font-size: 14px;
              color: #666;
            }
            .invoice-info {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .invoice-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            .label {
              font-weight: 600;
              color: #666;
            }
            .value {
              color: #333;
              font-weight: 500;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              background: ${STATUS_COLORS[(order.status as keyof typeof STATUS_COLORS)|| "pending"]};
              color: white;
            }
            h2 {
              color: ${PRIMARY_COLOR};
              margin: 30px 0 15px 0;
              font-size: 20px;
              border-bottom: 2px solid #e0e0e0;
              padding-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
            }
            th {
              background: ${PRIMARY_COLOR};
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e0e0e0;
            }
            tr:last-child td {
              border-bottom: none;
            }
            tr:hover {
              background: #f8f9fa;
            }
            .total-row {
              background: #f8f9fa;
              font-weight: bold;
              font-size: 18px;
            }
            .total-row td {
              padding: 16px 12px;
              color: ${PRIMARY_COLOR};
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
            }
            .support-box {
              background: #fff3e0;
              padding: 20px;
              border-radius: 8px;
              margin-top: 20px;
              border-left: 4px solid #ff9800;
            }
            .support-title {
              font-weight: bold;
              color: #e65100;
              margin-bottom: 10px;
            }
            .contact-info {
              color: #666;
              font-size: 14px;
            }
            .thank-you {
              font-size: 18px;
              font-weight: 600;
              color: ${PRIMARY_COLOR};
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="header">
            <div class="logo">🍲 CallOnDemand</div>
            <div class="tagline">Food Delivery & Services</div>
          </div>

          <!-- Invoice Info -->
          <div class="invoice-info">
            <div class="invoice-row">
              <span class="label">Invoice Number:</span>
              <span class="value">#${order.id}</span>
            </div>
            <div class="invoice-row">
              <span class="label">Date:</span>
              <span class="value">${
                order.createdAt?.seconds
                  ? new Date(order.createdAt.seconds * 1000).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"
              }</span>
            </div>
            <div class="invoice-row">
              <span class="label">Customer:</span>
              <span class="value">${order.buyerName}</span>
            </div>
            <div class="invoice-row">
              <span class="label">Delivery Address:</span>
              <span class="value">${order.address}</span>
            </div>
            <div class="invoice-row">
              <span class="label">Phone:</span>
              <span class="value">${order.phone}</span>
            </div>
            <div class="invoice-row">
              <span class="label">Status:</span>
              <span class="status-badge">${order.status}</span>
            </div>
          </div>

          <!-- Order Details -->
          <h2>📋 Order Details</h2>
          <table>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Amount</th>
            </tr>
            <tr>
              <td><strong>${order.foodName}</strong></td>
              <td style="text-align: center;">1</td>
              <td style="text-align: right;">₦${order.totalPrice?.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Portions</td>
              <td style="text-align: center;">${order.portionCount}</td>
              <td style="text-align: right;">Included</td>
            </tr>
          </table>

          ${
            order.proteins?.length > 0
              ? `
          <h2>🍗 Proteins</h2>
          <table>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Price</th>
            </tr>
            ${formatItemsTable(order.proteins)}
          </table>
          `
              : ""
          }

          ${
            order.soups?.length > 0
              ? `
          <h2>🥘 Soups</h2>
          <table>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Price</th>
            </tr>
            ${formatItemsTable(order.soups)}
          </table>
          `
              : ""
          }

          ${
            order.extras?.length > 0
              ? `
          <h2>➕ Extras</h2>
          <table>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Price</th>
            </tr>
            ${formatItemsTable(order.extras)}
          </table>
          `
              : ""
          }

          ${
            order.subFromDate && order.subToDate
              ? `
          <h2>📅 Subscription Details</h2>
          <table>
            <tr>
              <td><strong>Daily Quantity:</strong></td>
              <td>${order.subQuantity}</td>
            </tr>
            <tr>
              <td><strong>Period:</strong></td>
              <td>${order.subFromDate} to ${order.subToDate}</td>
            </tr>
          </table>
          `
              : ""
          }

          <!-- Total -->
          <table>
            <tr class="total-row">
              <td><strong>TOTAL AMOUNT</strong></td>
              <td></td>
              <td style="text-align: right;"><strong>₦${order.totalPrice?.toLocaleString()}</strong></td>
            </tr>
          </table>

          <!-- Footer -->
          <div class="footer">
            <p class="thank-you">Thank you for your order! 🙏</p>
            
            <div class="support-box">
              <div class="support-title">Need Help?</div>
              <div class="contact-info">
                📞 Call us: <strong>08140002708</strong><br>
                📧 Email: support@callondemand.com<br>
                For complaints, delays, or any issues with your order
              </div>
            </div>

            <p style="margin-top: 30px; color: #999; font-size: 12px;">
              This is a computer-generated invoice and does not require a signature.<br>
              © ${new Date().getFullYear()} CallOnDemand. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === "ios" || Platform.OS === "android") {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Share Invoice",
            UTI: "com.adobe.pdf",
          });
        } else {
          Alert.alert("Success", "Invoice saved!");
        }
      } else {
        Alert.alert("Success", `Invoice saved to: ${uri}`);
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      Alert.alert("Error", "Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large" />
        <Text style={styles.loadingText}>Loading invoice...</Text>
      </View>
    );

  if (!order)
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome5 name="receipt" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Invoice Not Found</Text>
        <Text style={styles.emptyText}>
          This invoice could not be loaded.
        </Text>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          Go Back
        </Button>
      </View>
    );

  const statusColor = STATUS_COLORS[order.status as keyof typeof STATUS_COLORS] || WARNING_COLOR;
  const statusIcon = STATUS_ICONS[order.status as keyof typeof STATUS_ICONS] || "clock";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.invoiceLabel}>Invoice</Text>
              <Text style={styles.invoiceNumber}>#{order.id}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <FontAwesome5 name={statusIcon} size={16} color="#fff" />
              <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
            </View>
          </View>
          <Divider style={{ marginVertical: 16 }} />
          <View style={styles.infoRow}>
            <FontAwesome5 name="calendar" size={14} color="#666" />
            <Text style={styles.infoText}>
              {order.createdAt?.seconds
                ? new Date(order.createdAt.seconds * 1000).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="user" size={14} color="#666" />
            <Text style={styles.infoText}>{order.buyerName}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Order Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>📋 Order Details</Text>
          <View style={styles.orderItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{order.foodName}</Text>
              <Text style={styles.itemMeta}>
                {order.portionCount} portion(s)
              </Text>
            </View>
            <Text style={styles.itemPrice}>
              ₦{order.totalPrice?.toLocaleString()}
            </Text>
          </View>

          {order.proteins?.length > 0 && (
            <>
              <Divider style={{ marginVertical: 12 }} />
              <Text style={styles.subsectionTitle}>🍗 Proteins:</Text>
              {order.proteins.map((p: any, idx: number) => (
                <View key={idx} style={styles.subItem}>
                  <Text style={styles.subItemText}>
                    {p.name} {p.quantity > 1 && `(×${p.quantity})`}
                  </Text>
                  <Text style={styles.subItemPrice}>
                    ₦{(p.price * (p.quantity || 1)).toLocaleString()}
                  </Text>
                </View>
              ))}
            </>
          )}

          {order.soups?.length > 0 && (
            <>
              <Divider style={{ marginVertical: 12 }} />
              <Text style={styles.subsectionTitle}>🥘 Soups:</Text>
              {order.soups.map((s: any, idx: number) => (
                <View key={idx} style={styles.subItem}>
                  <Text style={styles.subItemText}>
                    {s.name} {s.quantity > 1 && `(×${s.quantity})`}
                  </Text>
                  <Text style={styles.subItemPrice}>
                    ₦{(s.price * (s.quantity || 1)).toLocaleString()}
                  </Text>
                </View>
              ))}
            </>
          )}

          {order.extras?.length > 0 && (
            <>
              <Divider style={{ marginVertical: 12 }} />
              <Text style={styles.subsectionTitle}>➕ Extras:</Text>
              {order.extras.map((e: any, idx: number) => (
                <View key={idx} style={styles.subItem}>
                  <Text style={styles.subItemText}>
                    {e.name} {e.quantity > 1 && `(×${e.quantity})`}
                  </Text>
                  <Text style={styles.subItemPrice}>
                    ₦{(e.price * (e.quantity || 1)).toLocaleString()}
                  </Text>
                </View>
              ))}
            </>
          )}
        </Card.Content>
      </Card>

      {/* Subscription Details */}
      {order.subFromDate && order.subToDate && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📅 Subscription</Text>
            <View style={styles.subscriptionInfo}>
              <View style={styles.subInfoRow}>
                <Text style={styles.subLabel}>Daily Quantity:</Text>
                <Text style={styles.subValue}>{order.subQuantity}</Text>
              </View>
              <View style={styles.subInfoRow}>
                <Text style={styles.subLabel}>Period:</Text>
                <Text style={styles.subValue}>
                  {order.subFromDate} to {order.subToDate}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Delivery Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>📍 Delivery Information</Text>
          <View style={styles.deliveryInfo}>
            <View style={styles.deliveryRow}>
              <FontAwesome5 name="map-marker-alt" size={16} color={PRIMARY_COLOR} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.deliveryLabel}>Address</Text>
                <Text style={styles.deliveryValue}>{order.address}</Text>
              </View>
            </View>
            <View style={styles.deliveryRow}>
              <FontAwesome5 name="phone" size={16} color={PRIMARY_COLOR} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.deliveryLabel}>Phone</Text>
                <Text style={styles.deliveryValue}>{order.phone}</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Total Card */}
      <Card style={styles.totalCard}>
        <Card.Content>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
            <Text style={styles.totalValue}>
              ₦{order.totalPrice?.toLocaleString()}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          icon="download"
          onPress={generatePDF}
          loading={generating}
          disabled={generating}
          style={styles.actionButton}
          contentStyle={styles.actionButtonContent}
        >
          {generating ? "Generating..." : "Download Invoice"}
        </Button>

        <Button
          mode="outlined"
          icon="phone"
          onPress={() => Alert.alert("Support", "Call 08140002708 for help.")}
          style={styles.actionButton}
        >
          Contact Support
        </Button>

        <Button
          mode="text"
          icon="arrow-left"
          onPress={() => router.back()}
          style={{ marginTop: 8 }}
        >
          Back to Orders
        </Button>
      </View>

      {/* Support Info */}
      <Card style={styles.supportCard}>
        <Card.Content>
          <View style={styles.supportHeader}>
            <FontAwesome5 name="headset" size={24} color={WARNING_COLOR} />
            <Text style={styles.supportTitle}>Need Help?</Text>
          </View>
          <Text style={styles.supportText}>
            For complaints, delays, or any issues with your order:
          </Text>
          <View style={styles.contactRow}>
            <FontAwesome5 name="phone" size={14} color="#666" />
            <Text style={styles.contactText}>08140002708</Text>
          </View>
          <View style={styles.contactRow}>
            <FontAwesome5 name="envelope" size={14} color="#666" />
            <Text style={styles.contactText}>support@callondemand.com</Text>
          </View>
        </Card.Content>
      </Card>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  headerCard: {
    margin: 16,
    marginBottom: 12,
    elevation: 4,
    borderRadius: 16,
    backgroundColor: BACKGROUND_COLOR,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  invoiceLabel: {
    fontSize: 12,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  invoiceNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    color: "#666",
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  subItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingLeft: 12,
  },
  subItemText: {
    fontSize: 14,
    color: "#666",
  },
  subItemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  subscriptionInfo: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 8,
  },
  subInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 14,
    color: "#666",
  },
  subValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  deliveryInfo: {
    gap: 16,
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  deliveryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  deliveryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  totalCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 4,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  actionsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 12,
  },
  actionButtonContent: {
    paddingVertical: 6,
  },
  supportCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFF3E0",
    elevation: 0,
    borderLeftWidth: 4,
    borderLeftColor: WARNING_COLOR,
  },
  supportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E65100",
  },
  supportText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  contactText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
});