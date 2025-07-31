/**
 * Date utilities to handle timezone-aware formatting
 * This ensures dates are displayed as stored in UTC without local timezone conversion
 */

export function formatAppointmentDateTime(dateString: string): string {
  const utcDate = new Date(dateString);
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const year = utcDate.getUTCFullYear();
  const hours = String(utcDate.getUTCHours()).padStart(2, '0');
  const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} à ${hours}:${minutes}`;
}

export function formatAppointmentDateTimeUS(dateString: string): string {
  const utcDate = new Date(dateString);
  const day = utcDate.getUTCDate();
  const month = utcDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = utcDate.getUTCFullYear();
  const hours = utcDate.getUTCHours();
  const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${month} ${day}, ${year} at ${displayHours}:${minutes} ${ampm}`;
}

export function formatTimeOnly(dateString: string): string {
  const utcDate = new Date(dateString);
  const hours = String(utcDate.getUTCHours()).padStart(2, '0');
  const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateOnly(dateString: string): string {
  const utcDate = new Date(dateString);
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const year = utcDate.getUTCFullYear();
  return `${day}/${month}/${year}`;
}