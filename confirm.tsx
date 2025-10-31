import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

const PRIMARY_COLOR = "#6200EE";

export default function ConfirmService() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Transaction</Text>
      <Text style={styles.text}>
        Review your transaction details before proceeding.
      </Text>

      <Button
        mode="contained"
        style={styles.btn}
        onPress={() => alert("Transaction Confirmed!")}
      >
        Confirm
      </Button>

      <Button
        mode="outlined"
        textColor={PRIMARY_COLOR}
        onPress={() => router.back()}
      >
        Go Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    textAlign: "center",
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    textAlign: "center",
    color: "#444",
    marginBottom: 25,
  },
  btn: {
    backgroundColor: PRIMARY_COLOR,
    marginBottom: 10,
  },
});
