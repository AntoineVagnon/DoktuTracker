// Phone number formatting utility
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters except +
  const cleaned = value.replace(/[^\d+]/g, '');

  // If it starts with +, format international number
  if (cleaned.startsWith('+')) {
    const countryCode = cleaned.slice(0, 3); // e.g., +49
    const rest = cleaned.slice(3);

    // Format based on length
    if (rest.length <= 2) {
      return `${countryCode} ${rest}`;
    } else if (rest.length <= 10) {
      // Format as: +49 30 12345678
      const area = rest.slice(0, 2);
      const number = rest.slice(2);
      return `${countryCode} ${area} ${number}`;
    }
    return `${countryCode} ${rest.slice(0, 2)} ${rest.slice(2)}`;
  }

  return cleaned;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Calculate optimal bio length
export function getBioStats(bio: string) {
  const length = bio.length;
  const optimal = 245;
  const max = 2000;

  let status: 'short' | 'optimal' | 'long' | 'too-long' = 'short';

  if (length === 0) {
    status = 'short';
  } else if (length < optimal) {
    status = 'short';
  } else if (length <= 500) {
    status = 'optimal';
  } else if (length <= max) {
    status = 'long';
  } else {
    status = 'too-long';
  }

  return { length, optimal, max, status };
}

// Estimate time remaining for each step
export function getEstimatedTime(currentStep: number): string {
  const times = {
    1: '3-4 minutes',
    2: '2-3 minutes',
    3: '2 minutes',
    4: '3-5 minutes',
    5: '1 minute',
  };

  return times[currentStep as keyof typeof times] || '';
}

// Available languages for multi-select
export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pl', name: 'Polish' },
  { code: 'ro', name: 'Romanian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'el', name: 'Greek' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'cs', name: 'Czech' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
];

// Availability preferences
export const AVAILABILITY_PREFERENCES = [
  { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
  { value: 'weekends', label: 'Weekends (Sat-Sun)' },
  { value: 'mornings', label: 'Mornings (8AM-12PM)' },
  { value: 'afternoons', label: 'Afternoons (12PM-6PM)' },
  { value: 'evenings', label: 'Evenings (6PM-10PM)' },
  { value: 'flexible', label: 'Flexible / All times' },
];

// Auto-save to localStorage
export function saveFormProgress(step: number, data: any) {
  try {
    const progressData = {
      step,
      data,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('doctorSignupProgress', JSON.stringify(progressData));
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

// Load saved progress
export function loadFormProgress(): { step: number; data: any } | null {
  try {
    const saved = localStorage.getItem('doctorSignupProgress');
    if (!saved) return null;

    const progress = JSON.parse(saved);

    // Check if saved data is less than 7 days old
    const savedDate = new Date(progress.timestamp);
    const daysDiff = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 7) {
      localStorage.removeItem('doctorSignupProgress');
      return null;
    }

    return { step: progress.step, data: progress.data };
  } catch (error) {
    console.error('Failed to load progress:', error);
    return null;
  }
}

// Clear saved progress
export function clearFormProgress() {
  try {
    localStorage.removeItem('doctorSignupProgress');
  } catch (error) {
    console.error('Failed to clear progress:', error);
  }
}
