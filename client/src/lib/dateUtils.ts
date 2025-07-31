/**
 * Date utilities to handle consistent local timezone formatting
 * This ensures all dates and times are displayed in the user's local timezone
 */

export function formatAppointmentDateTime(dateString: string): string {
  // Handle timezone properly - ensure we display the intended local time
  const localDate = new Date(dateString);
  // For existing appointments with incorrect timezone, adjust by subtracting 2 hours (UTC+2 offset)
  // This is a temporary fix until all appointments are stored correctly
  const adjustedDate = new Date(localDate.getTime() - (2 * 60 * 60 * 1000));
  
  const day = String(adjustedDate.getDate()).padStart(2, '0');
  const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
  const year = adjustedDate.getFullYear();
  const hours = String(adjustedDate.getHours()).padStart(2, '0');
  const minutes = String(adjustedDate.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} à ${hours}:${minutes}`;
}

export function formatAppointmentDateTimeUS(dateString: string): string {
  // Handle timezone properly - ensure we display the intended local time
  const localDate = new Date(dateString);
  // For existing appointments with incorrect timezone, adjust by subtracting 2 hours (UTC+2 offset)
  // This is a temporary fix until all appointments are stored correctly
  const adjustedDate = new Date(localDate.getTime() - (2 * 60 * 60 * 1000));
  
  const day = adjustedDate.getDate();
  const month = adjustedDate.toLocaleDateString('en-US', { month: 'short' });
  const year = adjustedDate.getFullYear();
  const hours = adjustedDate.getHours();
  const minutes = String(adjustedDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${month} ${day}, ${year} at ${displayHours}:${minutes} ${ampm}`;
}

export function formatTimeOnly(dateString: string): string {
  // Handle timezone properly - ensure we display the intended local time
  const localDate = new Date(dateString);
  // For existing appointments with incorrect timezone, adjust by subtracting 2 hours (UTC+2 offset)
  // This is a temporary fix until all appointments are stored correctly
  const adjustedDate = new Date(localDate.getTime() - (2 * 60 * 60 * 1000));
  
  const hours = String(adjustedDate.getHours()).padStart(2, '0');
  const minutes = String(adjustedDate.getMinutes()).padStart(2, '0');
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

// Convert time slot to local time for display (times are already stored in local time)
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
    
    // Since times are already stored in local time, just format them properly
    // No timezone conversion needed
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    // Fallback to original timeString if any error occurs
    return timeString;
  }
}