import { Stack } from "expo-router";
import { defaultHeaderConfig } from "@/lib/navigation";

export default function SecretSantaEventLayout() {
  return (
    <Stack screenOptions={defaultHeaderConfig}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="participants"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
