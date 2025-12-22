/**
 * Combines firstName and lastName into a display name
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Combined display name or null if both are null
 */
export function getDisplayName(firstName: string | null | undefined, lastName: string | null | undefined): string | null {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return firstName || lastName || null;
}

/**
 * Fetches user data from Clerk API
 * Returns user data or null if fetch fails
 */
export async function fetchUserFromClerk(clerkUserId: string) {
  try {
    const { createClerkClient } = await import('@clerk/backend');
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY || '',
    });
    const clerkUser = await clerk.users.getUser(clerkUserId);
    
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || `${clerkUserId}@clerk.temp`;
    
    // Generate a better username if Clerk doesn't provide one
    let username = clerkUser.username;
    if (!username) {
      // Try to generate from email (part before @)
      if (email && email !== `${clerkUserId}@clerk.temp` && email.includes('@')) {
        const emailPrefix = email.split('@')[0];
        // Clean the email prefix to make it a valid username (remove dots, keep alphanumeric and underscores)
        username = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
        // If it's too short or empty, fall back to a generated one
        if (!username || username.length < 3) {
          username = `user_${clerkUserId.slice(0, 8)}`;
        }
      } else {
        // Fallback to generated username
        username = `user_${clerkUserId.slice(0, 8)}`;
      }
    }
    
    return {
      email,
      phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || null,
      username,
      firstName: clerkUser.firstName || null,
      lastName: clerkUser.lastName || null,
      avatar: clerkUser.imageUrl || null,
    };
  } catch (error) {
    console.error(`⚠️ Failed to fetch user from Clerk (${clerkUserId}):`, error);
    return null;
  }
}




