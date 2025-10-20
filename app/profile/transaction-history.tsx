import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export default function TransactionHistory() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      <Text>You’ll see all wallet transactions here soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
});
