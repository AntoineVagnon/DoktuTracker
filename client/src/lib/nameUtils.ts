// Utility functions for displaying structured user names
// Implements the user story for structured name display

export interface UserNameData {
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string;
  email?: string;
  role?: string;
}

/**
 * Formats a user's full name using structured fields
 * Handles fallbacks gracefully for legacy data
 */
export function formatUserFullName(user: UserNameData): string {
  // If we have structured name fields, use them
  if (user.firstName || user.lastName) {
    const parts = [];
    
    // Add title for doctors if available
    if (user.title && user.role === 'doctor') {
      parts.push(user.title);
    }
    
    if (user.firstName) {
      parts.push(user.firstName);
    }
    
    if (user.lastName) {
      parts.push(user.lastName);
    }
    
    return parts.join(' ').trim();
  }
  
  // Fallback: try to parse from username
  if (user.username && user.username.includes('.')) {
    const [first, last] = user.username.split('.');
    const formattedFirst = first.charAt(0).toUpperCase() + first.slice(1);
    const formattedLast = last.charAt(0).toUpperCase() + last.slice(1);
    
    if (user.role === 'doctor') {
      return `Dr. ${formattedFirst} ${formattedLast}`;
    }
    return `${formattedFirst} ${formattedLast}`;
  }
  
  // Fallback: try to parse from email
  if (user.email) {
    const emailPart = user.email.split('@')[0];
    if (emailPart.includes('.')) {
      const [first, last] = emailPart.split('.');
      const formattedFirst = first.charAt(0).toUpperCase() + first.slice(1);
      const formattedLast = last.charAt(0).toUpperCase() + last.slice(1);
      
      if (user.role === 'doctor') {
        return `Dr. ${formattedFirst} ${formattedLast}`;
      }
      return `${formattedFirst} ${formattedLast}`;
    }
    
    // Single name from email
    const formatted = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
    if (user.role === 'doctor') {
      return `Dr. ${formatted}`;
    }
    return formatted;
  }
  
  // Ultimate fallback
  return "Unknown User";
}

/**
 * Gets display name for welcome messages (first name only)
 */
export function formatUserDisplayName(user: UserNameData): string {
  // Use structured first name if available
  if (user.firstName) {
    return user.firstName;
  }
  
  // Fallback: parse from username
  if (user.username && user.username.includes('.')) {
    const first = user.username.split('.')[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  
  // Fallback: parse from email
  if (user.email) {
    const emailPart = user.email.split('@')[0];
    if (emailPart.includes('.')) {
      const first = emailPart.split('.')[0];
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
    return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
  }
  
  return "User";
}

/**
 * Gets initials for avatars using structured fields
 */
export function getUserInitials(user: UserNameData): string {
  // Use structured name fields if available
  if (user.firstName && user.lastName) {
    return `${user.firstName.charAt(0).toUpperCase()}${user.lastName.charAt(0).toUpperCase()}`;
  }
  
  if (user.firstName) {
    return user.firstName.charAt(0).toUpperCase();
  }
  
  // Fallback: parse from username
  if (user.username && user.username.includes('.')) {
    const [first, last] = user.username.split('.');
    return `${first.charAt(0).toUpperCase()}${last.charAt(0).toUpperCase()}`;
  }
  
  // Fallback: parse from email
  if (user.email) {
    const emailPart = user.email.split('@')[0];
    if (emailPart.includes('.')) {
      const [first, last] = emailPart.split('.');
      return `${first.charAt(0).toUpperCase()}${last.charAt(0).toUpperCase()}`;
    }
    return emailPart.charAt(0).toUpperCase();
  }
  
  return "U";
}

/**
 * Formats name for search and filtering purposes
 */
export function getSearchableName(user: UserNameData): string {
  const fullName = formatUserFullName(user);
  // Remove titles for search purposes
  return fullName.replace(/^(Dr\.|M\.|Mme\.|Mr\.|Mrs\.|Ms\.)\s+/, '').trim();
}

/**
 * Parses legacy username into structured fields
 * Useful for migration or real-time conversion
 */
export function parseUsernameToStructuredName(username: string, role?: string): {
  title?: string;
  firstName?: string;
  lastName?: string;
} {
  if (!username) return {};
  
  const cleanUsername = username.toLowerCase();
  
  if (cleanUsername.includes('.')) {
    const [first, last] = cleanUsername.split('.');
    return {
      title: role === 'doctor' ? 'Dr.' : undefined,
      firstName: first.charAt(0).toUpperCase() + first.slice(1),
      lastName: last.charAt(0).toUpperCase() + last.slice(1)
    };
  }
  
  return {
    title: role === 'doctor' ? 'Dr.' : undefined,
    firstName: cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1),
    lastName: undefined
  };
}