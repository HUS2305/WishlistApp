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

/**
 * Interface for upcoming birthday information
 */
export interface UpcomingBirthday {
  friend: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    avatar?: string | null;
    displayName?: string | null;
  };
  birthdayDate: Date;
  daysUntil: number;
  formattedDate: string;
}

/**
 * Calculates upcoming birthdays from a list of friends
 * @param friends - Array of friends with birthday information
 * @param daysAhead - Number of days to look ahead (default: 30)
 * @returns Array of upcoming birthdays sorted by date
 */
export function getUpcomingBirthdays(
  friends: Array<{ id: string; firstName?: string | null; lastName?: string | null; username?: string | null; avatar?: string | null; displayName?: string | null; birthday?: string | null }>,
  daysAhead: number = 30
): UpcomingBirthday[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingBirthdays: UpcomingBirthday[] = [];
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  for (const friend of friends) {
    if (!friend.birthday) continue;

    try {
      const birthdayDate = new Date(friend.birthday);
      const currentYear = today.getFullYear();
      
      // Create this year's birthday date
      const thisYearBirthday = new Date(currentYear, birthdayDate.getMonth(), birthdayDate.getDate());
      
      // If this year's birthday has passed, use next year's
      const nextBirthday = thisYearBirthday < today
        ? new Date(currentYear + 1, birthdayDate.getMonth(), birthdayDate.getDate())
        : thisYearBirthday;

      // Check if birthday is within the lookahead period
      if (nextBirthday <= endDate) {
        const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Format the date (e.g., "Dec 25" or "Today" or "Tomorrow")
        let formattedDate: string;
        if (daysUntil === 0) {
          formattedDate = "Today";
        } else if (daysUntil === 1) {
          formattedDate = "Tomorrow";
        } else {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          formattedDate = `${monthNames[nextBirthday.getMonth()]} ${nextBirthday.getDate()}`;
        }

        upcomingBirthdays.push({
          friend: {
            id: friend.id,
            firstName: friend.firstName,
            lastName: friend.lastName,
            username: friend.username,
            avatar: friend.avatar,
            displayName: friend.displayName || getDisplayName(friend) || friend.username || "Friend",
          },
          birthdayDate: nextBirthday,
          daysUntil,
          formattedDate,
        });
      }
    } catch (error) {
      console.error(`Error parsing birthday for friend ${friend.id}:`, error);
      continue;
    }
  }

  // Sort by date (soonest first)
  return upcomingBirthdays.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) {
      return a.daysUntil - b.daysUntil;
    }
    return a.birthdayDate.getTime() - b.birthdayDate.getTime();
  });
}

