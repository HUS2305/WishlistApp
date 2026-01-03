import { Stack } from "expo-router";
import { defaultHeaderConfig } from "@/lib/navigation";

/**
 * Root layout for screens that are not part of tabs or auth
 * This includes: notifications, appearance, profile/edit
 */
export default function RootLayout() {
  // NOTE: screenOptions cannot use hooks - theme will be applied in individual screens
  // using useHeaderOptions hook in their useLayoutEffect
  return (
    <Stack
      screenOptions={defaultHeaderConfig}
    >
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: true,
          // Header will be configured dynamically in the screen component
        }}
      />
      <Stack.Screen
        name="appearance"
        options={{
          headerShown: true,
          title: "Appearance",
        }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{
          headerShown: true,
          title: "Edit Profile",
        }}
      />
    </Stack>
  );
}

