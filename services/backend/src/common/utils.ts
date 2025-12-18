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
