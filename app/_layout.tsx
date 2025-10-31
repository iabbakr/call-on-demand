import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useSecureAction } from "@/hooks/useSecureAction";
import { Stack, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import PinDialog from "./components/security/PinDialog";

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { secureAction, showPinDialog, setShowPinDialog, verifyPin } = useSecureAction();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth");
      } else {
        // 🔐 Ask for biometric or PIN on app start
        secureAction(() => {
          console.log("Unlocked app ✅");
        });
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  return (
    <>
      {children}

      {/* 🔐 Global PIN dialog */}
      <PinDialog
        visible={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onSubmit={verifyPin}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppProvider>
          <PaperProvider>
            <RouteGuard>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
              </Stack>
            </RouteGuard>
          </PaperProvider>
        </AppProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
