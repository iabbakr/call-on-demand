import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { PaperProvider } from "react-native-paper";

// 🔒 RouteGuard checks authentication before rendering children
function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth"); // Not logged in
      } else {
        router.replace("/(tabs)"); // Logged in
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

  return <>{children}</>;
}

// 🧩 Root layout that wraps everything
export default function RootLayout() {
  return (
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
  );
}
