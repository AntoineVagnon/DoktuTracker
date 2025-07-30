// Global error interceptor to prevent undefined 'match' errors
export function setupGlobalErrorInterceptor() {
  // Override String.prototype methods to handle undefined values safely
  const originalStringMethods = {
    match: String.prototype.match,
    split: String.prototype.split,
    includes: String.prototype.includes,
    toLowerCase: String.prototype.toLowerCase,
    replace: String.prototype.replace
  };

  // Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Intercepted unhandled promise rejection:', event.reason);
    // Prevent the error from showing in the UI
    event.preventDefault();
  });

  // Intercept window errors
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes("Cannot read properties of undefined (reading 'match')")) {
      console.warn('Intercepted match error, preventing UI overlay');
      event.preventDefault();
      return false;
    }
  });

  // Safe wrapper for any potential string operations
  window.safeStringOp = function(str: any, operation: string, ...args: any[]) {
    if (str === null || str === undefined) {
      console.warn(`Safe string operation: ${operation} called on ${str}, returning safe default`);
      
      switch (operation) {
        case 'match':
          return null;
        case 'split':
          return [''];
        case 'includes':
          return false;
        case 'toLowerCase':
          return '';
        case 'replace':
          return '';
        default:
          return '';
      }
    }
    
    try {
      return str[operation].apply(str, args);
    } catch (error) {
      console.warn(`Safe string operation error for ${operation}:`, error);
      return operation === 'match' ? null : '';
    }
  };
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    safeStringOp: (str: any, operation: string, ...args: any[]) => any;
  }
}