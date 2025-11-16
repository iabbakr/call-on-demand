import { Feather, MaterialIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const PRIMARY_COLOR = "#6200EE";
const PRIMARY_LIGHT = "#7C3AED";
const BACKGROUND_COLOR = "#FFFFFF";
const SURFACE_COLOR = "#F8F9FA";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_SECONDARY = "#6B7280";
const BORDER_COLOR = "#E5E7EB";
const ICON_BG = "#F3F0FF";
const SHADOW_COLOR = "#000";

export default function SecuritySettings() {
  const router = useRouter();

  const sections = [
    {
      title: "Account Security",
      items: [
        { 
          label: "Change Password", 
          icon: "lock", 
          route: "/profile/security/change-password",
          description: "Update your account password"
        },
        { 
          label: "Change Transaction PIN", 
          icon: "key", 
          route: "/profile/security/change-pin",
          description: "Secure your transactions"
        },
      ]
    },
    {
      title: "Contact Information",
      items: [
        { 
          label: "Change Email", 
          icon: "mail", 
          route: "/profile/security/change-email",
          description: "Update your email address"
        },
        { 
          label: "Change Mobile Number", 
          icon: "phone", 
          route: "/profile/security/change-mobile",
          description: "Update your phone number"
        },
      ]
    },
    {
      title: "Payment Details",
      items: [
        { 
          label: "Update Bank Account", 
          icon: "credit-card", 
          route: "/profile/security/update-bank",
          description: "Manage your bank details"
        },
      ]
    }
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: "Security Settings",
          headerStyle: { backgroundColor: PRIMARY_COLOR },
          headerTintColor: "#fff",
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable 
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIconContainer}>
            <MaterialIcons name="shield" size={24} color={PRIMARY_COLOR} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Keep Your Account Safe</Text>
            <Text style={styles.infoText}>
              Regularly update your security settings to protect your account
            </Text>
          </View>
        </View>

        {/* Sections */}
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.option,
                      pressed && styles.optionPressed
                    ]}
                    onPress={() => router.push(item.route as any)}
                  >
                    <View style={styles.optionLeft}>
                      <View style={styles.iconContainer}>
                        <Feather name={item.icon as any} size={20} color={PRIMARY_COLOR} />
                      </View>
                      <View style={styles.optionTextContainer}>
                        <Text style={styles.optionText}>{item.label}</Text>
                        <Text style={styles.optionDescription}>{item.description}</Text>
                      </View>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={TEXT_SECONDARY}
                    />
                  </Pressable>
                  
                  {itemIndex < section.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Footer Note */}
        <View style={styles.footer}>
          <MaterialIcons name="info-outline" size={18} color={TEXT_SECONDARY} />
          <Text style={styles.footerText}>
            These changes will take effect immediately and may require re-authentication
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: SURFACE_COLOR,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  backButton: {
    paddingLeft: 8,
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ICON_BG,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_SECONDARY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: BACKGROUND_COLOR,
  },
  optionPressed: {
    backgroundColor: SURFACE_COLOR,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ICON_BG,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginLeft: 72,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 16,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 12,
    marginTop: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
});