import { Stack } from "expo-router";
import { defaultHeaderConfig } from "@/lib/navigation";

export default function SecretSantaLayout() {
  return (
    <Stack screenOptions={defaultHeaderConfig}>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
