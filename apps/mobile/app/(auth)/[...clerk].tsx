import { Redirect } from "expo-router";

/**
 * Catch-all route for Clerk's internal routing
 * Clerk's SignUp/SignIn components use sub-routes like /signup/verify-email-address
 * This catch-all route handles those and redirects appropriately
 */
export default function ClerkCatchAll() {
  // Redirect to signup page - Clerk will handle the internal routing
  return <Redirect href="/(auth)/signup" />;
}






