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

/**
 * Appointment timing and status utilities
 */

export type AppointmentTimingStatus = 'upcoming' | 'live' | 'completed';

export interface AppointmentWithTiming {
  id: string | number;
  appointmentDate: string;
  status: string;
  [key: string]: any;
}

/**
 * Get the timing status of an appointment based on current time
 * - upcoming: 5+ minutes before start time
 * - live: within 5 minutes of start time until end time (assumes 30-minute duration)
 * - completed: past the end time
 */
export function getAppointmentTimingStatus(appointmentDate: string): AppointmentTimingStatus {
  const now = new Date();
  
  // Handle timezone adjustment for existing appointments
  const appointmentTime = new Date(appointmentDate);
  const adjustedAppointmentTime = new Date(appointmentTime.getTime() - (2 * 60 * 60 * 1000));
  
  // Calculate time differences in minutes
  const timeDifference = (adjustedAppointmentTime.getTime() - now.getTime()) / (1000 * 60);
  
  // Assume 30-minute appointment duration
  const appointmentDurationMinutes = 30;
  const appointmentEndTime = adjustedAppointmentTime.getTime() + (appointmentDurationMinutes * 60 * 1000);
  const timeUntilEnd = (appointmentEndTime - now.getTime()) / (1000 * 60);
  
  // Logic for timing status
  if (timeUntilEnd <= 0) {
    return 'completed'; // Past the end time
  } else if (timeDifference <= 5) {
    return 'live'; // Within 5 minutes of start time (or already started but not ended)
  } else {
    return 'upcoming'; // More than 5 minutes before start time
  }
}

/**
 * Filter and categorize appointments by their timing status
 */
export function categorizeAppointmentsByTiming(appointments: AppointmentWithTiming[]) {
  const upcoming: AppointmentWithTiming[] = [];
  const live: AppointmentWithTiming[] = [];
  const completed: AppointmentWithTiming[] = [];
  
  appointments.forEach(appointment => {
    // Only process confirmed/paid appointments
    if (appointment.status === 'confirmed' || appointment.status === 'paid') {
      const timingStatus = getAppointmentTimingStatus(appointment.appointmentDate);
      
      switch (timingStatus) {
        case 'upcoming':
          upcoming.push(appointment);
          break;
        case 'live':
          live.push(appointment);
          break;
        case 'completed':
          completed.push(appointment);
          break;
      }
    }
  });
  
  // Sort by appointment date
  const sortByDate = (a: AppointmentWithTiming, b: AppointmentWithTiming) => 
    new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
  
  return {
    upcoming: upcoming.sort(sortByDate),
    live: live.sort(sortByDate),
    completed: completed.sort(sortByDate)
  };
}

/**
 * Get time until appointment in a human-readable format
 */
export function getTimeUntilAppointment(appointmentDate: string): string {
  const now = new Date();
  const appointmentTime = new Date(appointmentDate);
  const adjustedAppointmentTime = new Date(appointmentTime.getTime() - (2 * 60 * 60 * 1000));
  
  const timeDifference = adjustedAppointmentTime.getTime() - now.getTime();
  const minutes = Math.floor(timeDifference / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (minutes < 0) {
    return 'Started';
  } else if (minutes < 60) {
    return `${minutes}m`;
  } else {
    return `${hours}h ${remainingMinutes}m`;
  }
}