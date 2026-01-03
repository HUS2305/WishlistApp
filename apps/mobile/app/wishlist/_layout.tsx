import { Stack } from "expo-router";
import { defaultHeaderConfig } from "@/lib/navigation";

export default function WishlistLayout() {
  // NOTE: screenOptions cannot use hooks - theme will be applied in individual screens
  // using useHeaderOptions hook in their useLayoutEffect
  return (
    <Stack
      screenOptions={defaultHeaderConfig}
    >
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          // Header will be configured dynamically in the screen component
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: true,
          title: "Create Wishlist",
        }}
      />
      <Stack.Screen
        name="[id]/add-item"
        options={{
          headerShown: true,
          title: "Add Item",
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          headerShown: true,
          title: "Edit Wishlist",
        }}
      />
    </Stack>
  );
}

