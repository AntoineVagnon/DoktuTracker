/**
 * Date utilities to handle consistent local timezone formatting
 * This ensures all dates and times are displayed in the user's local timezone
 */

export function formatAppointmentDateTime(dateString: string): string {
  const localDate = new Date(dateString);
  const day = String(localDate.getDate()).padStart(2, '0');
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const year = localDate.getFullYear();
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} à ${hours}:${minutes}`;
}

export function formatAppointmentDateTimeUS(dateString: string): string {
  const localDate = new Date(dateString);
  const day = localDate.getDate();
  const month = localDate.toLocaleDateString('en-US', { month: 'short' });
  const year = localDate.getFullYear();
  const hours = localDate.getHours();
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${month} ${day}, ${year} at ${displayHours}:${minutes} ${ampm}`;
}

export function formatTimeOnly(dateString: string): string {
  const localDate = new Date(dateString);
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateOnly(dateString: string): string {
  const localDate = new Date(dateString);
  const day = String(localDate.getDate()).padStart(2, '0');
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const year = localDate.getFullYear();
  return `${day}/${month}/${year}`;
}

// Utility to convert time slot strings to local time display
export function formatSlotTime(timeString: string): string {
  // timeString is in format "HH:MM:SS" or "HH:MM"
  const [hours, minutes] = timeString.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}