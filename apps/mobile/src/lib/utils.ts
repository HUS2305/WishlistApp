import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Similar to shadcn/ui's cn utility
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Combines firstName and lastName into a display name
 * @param user - User object with firstName and lastName, OR firstName string
 * @param lastName - Optional lastName if first param is a string
 * @returns Combined display name or null if both are null
 */
export function getDisplayName(
  user: { firstName?: string | null; lastName?: string | null } | string | null | undefined,
  lastName?: string | null | undefined
): string | null {
  let firstName: string | null | undefined;
  
  // Handle both function signatures: getDisplayName(user) or getDisplayName(firstName, lastName)
  if (typeof user === "string" || user === null || user === undefined) {
    firstName = user;
  } else {
    firstName = user.firstName;
    lastName = user.lastName;
  }

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return firstName || lastName || null;
}

