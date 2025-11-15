import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { db } from "../../../../lib/firebase";

const PRIMARY_COLOR = "#6200EE";

export default function AdminRequestManagement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const snap = await getDocs(collection(db, "logistics_orders"));
      setRequests(snap.docs.map(d=>({ id:d.id,...d.data() })));
      setLoading(false);
    };
    fetchRequests();
  }, []);

  const updateStatus = async (id:string, status:"approved"|"rejected") => {
    try {
      await updateDoc(doc(db,"logistics_orders",id),{status});
      setRequests(prev=>prev.map(r=>r.id===id?{...r,status}:r));
    } catch(err) {
      Alert.alert("Error","Failed to update status.");
    }
  };

  if(loading) return <View style={styles.center}><Text>Loading...</Text></View>;

  return (
    <FlatList
      data={requests}
      keyExtractor={i=>i.id}
      renderItem={({item})=>(
        <Card style={styles.card}>
          <Card.Content>
            <Text>Customer: {item.buyerName}</Text>
            <Text>Pickup: {item.pickup}</Text>
            <Text>Destination: {item.destination}</Text>
            <Text>Status: {item.status}</Text>
          </Card.Content>
          {item.status==="pending" && (
            <Card.Actions>
              <Button mode="contained" onPress={()=>updateStatus(item.id,"approved")}>Approve</Button>
              <Button mode="outlined" onPress={()=>updateStatus(item.id,"rejected")} textColor="red">Reject</Button>
            </Card.Actions>
          )}
        </Card>
      )}
      contentContainerStyle={{ padding:16 }}
    />
  );
}

const styles = StyleSheet.create({
  card:{ marginBottom:12, borderRadius:12 },
  center:{ flex:1, justifyContent:"center", alignItems:"center" }
});

