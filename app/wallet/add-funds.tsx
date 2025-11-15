import { FontAwesome5 } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Text, TextInput } from "react-native-paper";
import { WebView } from "react-native-webview";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

const PRIMARY_COLOR = "#6200EE";
const BACKGROUND_COLOR = "#FFFFFF";
const INACTIVE_COLOR = "#757575";

export default function AddFundsScreen() {
  const { user } = useAuth();
  const { refreshBalance } = useApp();
  const [amount, setAmount] = useState("1000");
  const [showPayment, setShowPayment] = useState(false);

  const paystackPublicKey =
    Constants.expoConfig?.extra?.PAYSTACK_PUBLIC_KEY ||
    process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;

  if (!paystackPublicKey) {
    console.warn("Paystack public key not configured!");
  }

  const numericAmount = Number(amount);

  const generateReference = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `pay_${timestamp}_${random}`;
  };

  const handlePaymentSuccess = (reference: string) => {
    Alert.alert("✅ Payment Successful", `Payment completed!\nReference: ${reference}`);
    refreshBalance?.();
    setAmount("1000");
    setShowPayment(false);
  };

  const handlePaymentCancel = () => {
    Alert.alert("❌ Payment Cancelled", "You cancelled the payment.");
    setShowPayment(false);
  };

  // HTML for Paystack Inline payment
  const getPaymentHTML = () => {
    const reference = generateReference();
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://js.paystack.co/v1/inline.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .container {
            background: white;
            padding: 40px 30px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 400px;
            width: 100%;
            animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        h2 {
            color: #333;
            margin-bottom: 10px;
            font-size: 24px;
        }
        .subtitle {
            color: #666;
            font-size: 14px;
            margin-bottom: 30px;
        }
        .amount {
            font-size: 48px;
            color: ${PRIMARY_COLOR};
            font-weight: bold;
            margin: 30px 0;
            letter-spacing: -2px;
        }
        .currency {
            font-size: 24px;
            opacity: 0.7;
        }
        .info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 12px;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 14px;
        }
        .info-label {
            color: #666;
        }
        .info-value {
            color: #333;
            font-weight: 600;
        }
        .btn {
            background: ${PRIMARY_COLOR};
            color: white;
            border: none;
            padding: 18px 32px;
            font-size: 16px;
            border-radius: 12px;
            cursor: pointer;
            width: 100%;
            margin-top: 20px;
            font-weight: 600;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(98, 0, 238, 0.3);
        }
        .btn:active {
            transform: scale(0.98);
            box-shadow: 0 2px 10px rgba(98, 0, 238, 0.3);
        }
        .btn-cancel {
            background: transparent;
            color: #666;
            margin-top: 10px;
            box-shadow: none;
            border: 2px solid #e0e0e0;
        }
        .btn-cancel:active {
            background: #f5f5f5;
        }
        .secure-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
        }
        .loading {
            display: none;
            margin-top: 20px;
        }
        .loading.active {
            display: block;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid ${PRIMARY_COLOR};
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">💳</div>
        <h2>Add Funds</h2>
        <p class="subtitle">You're about to add funds to your wallet</p>
        
        <div class="amount">
            <span class="currency">₦</span>${numericAmount.toLocaleString()}
        </div>

        <div class="info">
            <div class="info-row">
                <span class="info-label">Email</span>
                <span class="info-value">${user?.email || "test@example.com"}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Reference</span>
                <span class="info-value">${reference.substring(0, 15)}...</span>
            </div>
            <div class="info-row">
                <span class="info-label">Payment Method</span>
                <span class="info-value">Paystack</span>
            </div>
        </div>

        <button class="btn" onclick="payWithPaystack()" id="payBtn">
            🔒 Pay Securely
        </button>
        <button class="btn btn-cancel" onclick="cancelPayment()">
            Cancel
        </button>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p style="margin-top: 10px; color: #666;">Processing payment...</p>
        </div>

        <div class="secure-badge">
            🔒 Secured by Paystack
        </div>
    </div>

    <script>
        function showLoading() {
            document.getElementById('payBtn').style.display = 'none';
            document.getElementById('loading').classList.add('active');
        }

        function hideLoading() {
            document.getElementById('payBtn').style.display = 'block';
            document.getElementById('loading').classList.remove('active');
        }

        function payWithPaystack() {
            showLoading();
            
            try {
                const handler = PaystackPop.setup({
                    key: '${paystackPublicKey}',
                    email: '${user?.email || "test@example.com"}',
                    amount: ${numericAmount * 100},
                    currency: 'NGN',
                    ref: '${reference}',
                    onClose: function() {
                        hideLoading();
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            status: 'cancelled'
                        }));
                    },
                    callback: function(response) {
                        hideLoading();
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            status: 'success',
                            reference: response.reference
                        }));
                    }
                });
                handler.openIframe();
            } catch (error) {
                hideLoading();
                alert('Payment initialization failed. Please try again.');
                console.error('Paystack error:', error);
            }
        }

        function cancelPayment() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'cancelled'
            }));
        }
    </script>
</body>
</html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.status === 'success') {
        handlePaymentSuccess(data.reference);
      } else if (data.status === 'cancelled') {
        handlePaymentCancel();
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };

  if (isNaN(numericAmount) || numericAmount < 50) {
    return (
      <View style={styles.container}>
        <Card style={styles.errorCard}>
          <Card.Content>
            <FontAwesome5 name="exclamation-triangle" size={48} color="#D32F2F" style={{ textAlign: "center", marginBottom: 16 }} />
            <Text style={styles.errorTitle}>Invalid Amount</Text>
            <Text style={styles.errorText}>Minimum amount is ₦50</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (showPayment) {
    return (
      <View style={{ flex: 1 }}>
        <WebView
          source={{ html: getPaymentHTML() }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              <Text style={styles.loadingText}>Loading payment gateway...</Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.iconContainer}>
              <FontAwesome5 name="wallet" size={40} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.title}>Add Funds</Text>
            <Text style={styles.subtitle}>Top up your wallet balance securely</Text>
          </Card.Content>
        </Card>

        <Card style={styles.amountCard}>
          <Card.Content>
            <Text style={styles.label}>Amount to Add</Text>
            <View style={styles.amountDisplay}>
              <Text style={styles.currency}>₦</Text>
              <Text style={styles.displayAmount}>{numericAmount.toLocaleString()}</Text>
            </View>
          </Card.Content>
        </Card>

        <TextInput
          label="Enter Amount (₦)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
          mode="outlined"
          left={<TextInput.Icon icon="currency-ngn" />}
          right={<TextInput.Icon icon="cash" />}
        />

        <View style={styles.quickAmounts}>
          <Text style={styles.quickLabel}>Quick amounts:</Text>
          <View style={styles.quickRow}>
            {[1000, 2000, 5000, 10000].map((amt) => (
              <Button
                key={amt}
                mode="outlined"
                compact
                onPress={() => setAmount(amt.toString())}
                style={styles.quickBtn}
              >
                ₦{(amt / 1000).toFixed(0)}k
              </Button>
            ))}
          </View>
        </View>

        <Button
          mode="contained"
          style={styles.payButton}
          onPress={() => setShowPayment(true)}
          disabled={!paystackPublicKey}
          icon="credit-card"
          contentStyle={styles.payButtonContent}
        >
          Continue to Payment
        </Button>

        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <FontAwesome5 name="shield-alt" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.infoText}>Secure payment powered by Paystack</Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome5 name="lock" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.infoText}>Your data is encrypted and protected</Text>
            </View>
          </Card.Content>
        </Card>

        {!paystackPublicKey && (
          <Card style={styles.warningCard}>
            <Card.Content>
              <Text style={styles.warningText}>
                ⚠️ Paystack key not configured. Please check your environment variables.
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: "#F5F5F5" 
  },
  headerCard: {
    marginBottom: 20,
    elevation: 2,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: { 
    fontWeight: "700", 
    color: PRIMARY_COLOR, 
    fontSize: 28, 
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  amountCard: {
    marginBottom: 20,
    backgroundColor: INACTIVE_COLOR,
    elevation: 0,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  amountDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  currency: {
    fontSize: 24,
    color: PRIMARY_COLOR,
    opacity: 0.7,
    marginRight: 4,
  },
  displayAmount: {
    fontSize: 40,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  input: { 
    backgroundColor: BACKGROUND_COLOR, 
    marginBottom: 20,
  },
  quickAmounts: {
    marginBottom: 20,
  },
  quickLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickBtn: {
    flex: 1,
  },
  payButton: {
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  payButtonContent: {
    paddingVertical: 6,
  },
  infoCard: {
    backgroundColor: "#E8F5E9",
    elevation: 0,
    marginBottom: 16,
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
  warningCard: {
    backgroundColor: "#FFF3E0",
    elevation: 0,
  },
  warningText: {
    color: "#E65100",
    fontSize: 13,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: "#FFEBEE",
    marginTop: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#D32F2F",
    textAlign: "center",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
  },
});