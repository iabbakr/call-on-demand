import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function ServicePage() {
  const { service } = useLocalSearchParams<{ service: string }>();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>{service} Service Page</Text>
    </View>
  );
}
