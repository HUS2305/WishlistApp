import { Stack } from "expo-router";
import { defaultHeaderConfig } from "@/lib/navigation";

export default function FriendsLayout() {
  // NOTE: screenOptions cannot use hooks - theme will be applied in individual screens
  // using useHeaderOptions hook in their useLayoutEffect
  return (
    <Stack
      screenOptions={defaultHeaderConfig}
    >
      <Stack.Screen
        name="all"
        options={{
          headerShown: true,
          // Header will be configured dynamically in the screen component
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          // Header will be configured dynamically in the screen component
        }}
      />
      <Stack.Screen
        name="search"
        options={{
          headerShown: true,
          title: "Search Friends",
        }}
      />
      <Stack.Screen
        name="birthdays"
        options={{
          headerShown: true,
          // Header will be configured dynamically in the screen component
        }}
      />
    </Stack>
  );
}

