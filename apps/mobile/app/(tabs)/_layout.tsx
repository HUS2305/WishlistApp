import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import TabBarWithNotch from "@/components/TabBarWithNotch";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBarWithNotch {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Wishlists",
          tabBarIcon: ({ color, size }) => (
            <Feather name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
      {/* Placeholder for center FAB */}
      <Tabs.Screen
        name="_placeholder"
        options={{
          href: null, // This prevents it from being navigable
        }}
      />
      <Tabs.Screen
        name="gifts"
        options={{
          title: "Gifts",
          tabBarIcon: ({ color, size }) => (
            <Feather name="gift" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

