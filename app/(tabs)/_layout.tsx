import { Entypo, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const PRIMARY_COLOR = "#6200EE";
const SECONDARY_COLOR = "#03DAC6";
const INACTIVE_COLOR = "#757575";
const BACKGROUND_COLOR = "#FFFFFF";
const HEADER_BG = "#F5F5F5";

export default function RootLayout() {

  const router = useRouter();
  // Replace with actual user data from your auth context
  const userFirstName = "Abubakar";
  const userProfileImage = "https://res-console.cloudinary.com/dswwtuano/thumbnails/v1/image/upload/v1760121319/dGkzNHBybzJobGQ3Z2txNWFrZDg=/preview"; // Replace with actual image URL
  
  return (
    <Tabs 
      screenOptions={{ 
        headerTitle: () => {
            return (
                <View style={styles.headerLeft}>
                    <Pressable 
                        style={({ pressed }) => [   
                            styles.profileButton,
                            pressed && styles.profileButtonPressed
                        ]}
                        onPress={() => alert("Go to Profile")}
                    >
                        <View>
                            <Image 
                                source={{ uri: userProfileImage }} 
                                style={styles.profileImage} 
                            />
                        </View>
                    </Pressable>
                    <View style={styles.greetingContainer}>
                        <Text style={{fontWeight:"bold", fontSize: 15, color:INACTIVE_COLOR}}> Hello, {userFirstName}</Text>
                    </View>
                </View>         
            )
        },
        headerTitleAlign: "left",
        headerStyle: {
          backgroundColor: BACKGROUND_COLOR,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#E0E0E0",
          height: 120,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: "700",
          color: "#1A1A1A",
        },
        tabBarActiveTintColor: PRIMARY_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: BACKGROUND_COLOR,
          borderTopWidth: 1,
          borderTopColor: "#E0E0E0",
          height: 95,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
        headerRight: () => {
          return (
            <View style={styles.headerRight}>
              <Pressable 
                onPress={() => router.push("/support")}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed
                ]}
              >
                <MaterialIcons name="support-agent" size={22} color="#1A1A1A" />
              </Pressable>
              <Pressable 
                onPress={() => router.push("/notifications")}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed
                ]}
              >
                <View style={styles.notificationWrapper}>
                  <MaterialIcons name="notifications" size={22} color="#1A1A1A" />
                  <View style={styles.badge} />
                </View>
              </Pressable>
            </View>
          );
        }
      }} 
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: true,
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Entypo 
              name="home" 
              size={24} 
              color={focused ? PRIMARY_COLOR : INACTIVE_COLOR} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reward"
        options={{
          headerShown: false,
          tabBarLabel: "Rewards",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name="diamond-stone" 
              size={24} 
              color={focused ? PRIMARY_COLOR : INACTIVE_COLOR} 
            />
          ),
        }}        
      /> 
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Entypo 
              name="user" 
              size={24} 
              color={focused ? PRIMARY_COLOR : INACTIVE_COLOR} 
            />
          ),
        }}        
      />       
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 8,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: INACTIVE_COLOR,
  },
  profileButtonPressed: {
    opacity: 0.7,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  greetingContainer: {
    justifyContent: "center",
  },
  greeting: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 12,
    paddingVertical: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  iconButtonPressed: {
    backgroundColor: "#E0E0E0",
  },
  notificationWrapper: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
    borderWidth: 1.5,
    borderColor: "#F5F5F5",
  },
});