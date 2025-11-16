import { Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useApp } from "../../context/AppContext";

const PRIMARY_COLOR = "#6200EE";
const ACCENT_COLOR = "#E8DEF8";
const SUCCESS_COLOR = "#4CAF50";
const SCREEN_BG = "#F5F5F5";

export default function Support() {
  const { userProfile } = useApp();
  const isAdmin = userProfile?.role === "admin";

  const handleChatPress = () => {
    if (isAdmin) {
      router.push("/support/admin");
    } else {
      router.push("/support/chat");
    }
  };

  const supportOptions = [
    {
      id: "chat",
      icon: "message-square",
      iconType: "feather",
      title: isAdmin ? "Admin Inbox" : "In-App Chat",
      subtitle: isAdmin ? "Manage customer conversations" : "Chat with our support team",
      color: PRIMARY_COLOR,
      onPress: handleChatPress,
    },
    {
      id: "call",
      icon: "call",
      iconType: "material",
      title: "Call Us",
      subtitle: "+234 806 972 8683",
      color: SUCCESS_COLOR,
      onPress: () => Linking.openURL("tel:+2348069728683"),
    },
    {
      id: "email",
      icon: "email",
      iconType: "material",
      title: "Email Us",
      subtitle: "dangulbi01@gmail.com",
      color: "#FF9800",
      onPress: () => Linking.openURL("mailto:dangulbi01@gmail.com"),
    },
    {
      id: "whatsapp",
      icon: "WhatsApp",
      iconType: "font-awesome",
      title: "WhatsApp",
      subtitle: "Quick response on WhatsApp",
      color: "#25D366",
      onPress: () => Linking.openURL("https://wa.me/2348069728683"),
    },
  ];

  const faqItems = [
    {
      question: "How do I top up my wallet?",
      answer: "Go to Wallet > Top Up and choose your payment method.",
    },
    {
      question: "How long does delivery take?",
      answer: "Standard delivery takes 30-45 minutes within the city.",
    },
    {
      question: "Can I cancel my order?",
      answer: "Yes, you can cancel within 5 minutes of placing the order.",
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerIconContainer}>
          <MaterialIcons name="support-agent" size={48} color={PRIMARY_COLOR} />
        </View>
        <Text style={styles.headerTitle}>How can we help you?</Text>
        <Text style={styles.headerSubtitle}>
          We're here to help 24/7. Choose your preferred way to reach us.
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Support</Text>
        <View style={styles.optionsGrid}>
          {supportOptions.map((option) => (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                styles.optionCard,
                pressed && styles.optionCardPressed,
              ]}
              onPress={option.onPress}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color + "15" }]}>
                {option.iconType === "feather" ? (
                  <Feather name={option.icon as any} size={28} color={option.color} />
                ) : (
                  <MaterialIcons name={option.icon as any} size={28} color={option.color} />
                )}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Quick Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Quick Tips</Text>
        <View style={styles.tipsContainer}>
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <MaterialIcons name="access-time" size={20} color={PRIMARY_COLOR} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Fast Response</Text>
              <Text style={styles.tipText}>Average response time: 5 minutes</Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <MaterialIcons name="check-circle" size={20} color={SUCCESS_COLOR} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Resolution Rate</Text>
              <Text style={styles.tipText}>98% issues resolved on first contact</Text>
            </View>
          </View>
        </View>
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <View style={styles.faqHeader}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Pressable onPress={() => router.push("/support/faq")}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>
        <View style={styles.faqContainer}>
          {faqItems.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <View style={styles.faqQuestion}>
                <MaterialIcons name="help-outline" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.faqQuestionText}>{item.question}</Text>
              </View>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Emergency Contact */}
      <View style={styles.emergencyCard}>
        <MaterialIcons name="warning" size={32} color="#FF5722" />
        <View style={styles.emergencyContent}>
          <Text style={styles.emergencyTitle}>Emergency Support</Text>
          <Text style={styles.emergencyText}>
            For urgent issues, call us directly at +234 806 972 8683
          </Text>
        </View>
      </View>

      {/* Business Hours */}
      <View style={styles.hoursCard}>
        <MaterialIcons name="schedule" size={24} color={PRIMARY_COLOR} />
        <View style={styles.hoursContent}>
          <Text style={styles.hoursTitle}>Business Hours</Text>
          <Text style={styles.hoursText}>Monday - Friday: 9:00 AM - 6:00 PM</Text>
          <Text style={styles.hoursText}>Saturday: 10:00 AM - 4:00 PM</Text>
          <Text style={styles.hoursText}>Sunday: 10:00 AM - 4:00 PM</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header Section
  headerSection: {
    backgroundColor: "#fff",
    padding: 24,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT_COLOR + "40",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },

  // Options Grid
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  optionCardPressed: {
    backgroundColor: "#f9f9f9",
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: "#666",
  },

  // Quick Tips
  tipsContainer: {
    gap: 12,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT_COLOR + "30",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  tipText: {
    fontSize: 12,
    color: "#666",
  },

  // FAQ Section
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  faqContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  faqItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  faqAnswer: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginLeft: 28,
  },

  // Emergency Card
  emergencyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  emergencyContent: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF5722",
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },

  // Business Hours
  hoursCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  hoursContent: {
    marginLeft: 12,
    flex: 1,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  hoursText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
});