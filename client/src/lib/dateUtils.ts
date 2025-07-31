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

// Convert UTC time slot to local time for display
export function convertSlotTimeToLocal(date: string, timeString: string): string {
  try {
    // Ensure timeString is properly formatted (HH:MM:SS or HH:MM)
    const timeParts = timeString.split(':');
    if (timeParts.length < 2) {
      return timeString; // Return as-is if format is invalid
    }
    
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    // Validate hour and minute values
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return timeString; // Return as-is if values are invalid
    }
    
    // Create a proper UTC date string
    const fullTimeString = timeParts.length === 3 ? timeString : `${timeString}:00`;
    const utcDate = new Date(`${date}T${fullTimeString}.000Z`);
    
    // Check if the date is valid
    if (isNaN(utcDate.getTime())) {
      return timeString; // Return as-is if date creation failed
    }
    
    // Convert to local time and format
    const localHours = String(utcDate.getHours()).padStart(2, '0');
    const localMinutes = String(utcDate.getMinutes()).padStart(2, '0');
    
    return `${localHours}:${localMinutes}`;
  } catch (error) {
    // Fallback to original timeString if any error occurs
    return timeString;
  }
}