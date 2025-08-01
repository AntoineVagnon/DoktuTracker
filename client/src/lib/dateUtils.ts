/**
 * Date utilities to handle consistent local timezone formatting
 * This ensures all dates and times are displayed in the user's local timezone
 * Uses centralized timezone conversion utilities
 */

import { utcToLocal } from './timezoneUtils';

export function formatAppointmentDateTime(dateString: string): string {
  // Convert UTC appointment time to local time for display
  const localDate = utcToLocal(dateString);
  
  // Add validation to prevent NaN values
  if (isNaN(localDate.getTime())) {
    console.error('Invalid date string:', dateString);
    return 'Invalid date';
  }
  
  const day = String(localDate.getDate()).padStart(2, '0');
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const year = localDate.getFullYear();
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} à ${hours}:${minutes}`;
}

export function formatAppointmentDateTimeUS(dateString: string): string {
  // Convert UTC appointment time to local time for display
  const localDate = utcToLocal(dateString);
  
  // Add validation to prevent NaN values
  if (isNaN(localDate.getTime())) {
    console.error('Invalid date string:', dateString);
    return 'Invalid date';
  }
  
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
  // Convert UTC appointment time to local time for display
  const localDate = utcToLocal(dateString);
  
  // Add validation to prevent NaN values
  if (isNaN(localDate.getTime())) {
    console.error('Invalid date string:', dateString);
    return 'Invalid time';
  }
  
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
  
  // Convert UTC appointment time to local time
  const localAppointmentTime = utcToLocal(appointmentDate);
  
  // Remove detailed logging now that timezone fix is confirmed working
  // console.log('📊 Timing Status Check for appointment:', { appointmentDate, status: 'checking...' });
  
  // Validate date
  if (isNaN(localAppointmentTime.getTime())) {
    console.error('Invalid appointment date:', appointmentDate);
    return 'upcoming'; // Default to upcoming for invalid dates
  }
  
  // Calculate time differences in minutes
  const timeDifference = (localAppointmentTime.getTime() - now.getTime()) / (1000 * 60);
  
  // Assume 30-minute appointment duration
  const appointmentDurationMinutes = 30;
  const appointmentEndTime = localAppointmentTime.getTime() + (appointmentDurationMinutes * 60 * 1000);
  const timeUntilEnd = (appointmentEndTime - now.getTime()) / (1000 * 60);
  
  // console.log('📊 Time calculations:', { timeDifference: timeDifference.toFixed(1), timeUntilEnd: timeUntilEnd.toFixed(1) });
  
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
  
  // Convert UTC appointment time to local time
  const localAppointmentTime = utcToLocal(appointmentDate);
  
  // Validate date
  if (isNaN(localAppointmentTime.getTime())) {
    console.error('Invalid appointment date:', appointmentDate);
    return 'Invalid time';
  }
  
  const timeDifference = localAppointmentTime.getTime() - now.getTime();
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