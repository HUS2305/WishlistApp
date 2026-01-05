import { Stack } from "expo-router";
import { defaultHeaderConfig } from "@/lib/navigation";

export default function NotificationsLayout() {
  // NOTE: screenOptions cannot use hooks - theme will be applied in individual screens
  // using useHeaderOptions hook in their useLayoutEffect
  return (
    <Stack
      screenOptions={defaultHeaderConfig}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

