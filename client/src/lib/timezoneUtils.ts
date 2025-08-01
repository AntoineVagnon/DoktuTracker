/**
 * Centralized timezone utilities for consistent time handling across the app
 * All appointment times are stored in UTC and converted to local time for display
 */

/**
 * Convert UTC date string to local time for display
 */
export function utcToLocal(utcDateString: string): Date {
  // Simply return the Date object - JavaScript automatically handles timezone conversion
  return new Date(utcDateString);
}

/**
 * Convert local date to UTC for storage
 */
export function localToUtc(localDate: Date): Date {
  return new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
}

/**
 * Format any appointment date consistently with automatic timezone conversion
 */
export function formatAppointmentTime(utcDateString: string, options?: Intl.DateTimeFormatOptions): string {
  const localDate = utcToLocal(utcDateString);
  return localDate.toLocaleString([], options || { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

/**
 * Get current time in the user's timezone
 */
export function getCurrentLocalTime(): Date {
  return new Date();
}

/**
 * Check if a UTC appointment time is in the past
 */
export function isAppointmentInPast(utcDateString: string): boolean {
  const localAppointmentTime = utcToLocal(utcDateString);
  const now = getCurrentLocalTime();
  return localAppointmentTime < now;
}

/**
 * Get minutes until appointment (negative if in the past)
 */
export function getMinutesUntilAppointment(utcDateString: string): number {
  const localAppointmentTime = utcToLocal(utcDateString);
  const now = getCurrentLocalTime();
  return Math.floor((localAppointmentTime.getTime() - now.getTime()) / (1000 * 60));
}