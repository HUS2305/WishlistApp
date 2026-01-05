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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="search"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="birthdays"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

