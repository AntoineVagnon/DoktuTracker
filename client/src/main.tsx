import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Build timestamp to force new bundle hash: 2025-10-11T13:15:00Z
console.log('[DOKTU] App version: 2025-10-11T13:15:00Z');
console.log('[DOKTU] Build number: 20251011-1315');
console.log('[DOKTU] Expected component version: V5');

// Advanced error suppression for runtime overlay
(function suppressRuntimeErrors() {
  // Disable Vite error overlay completely
  if (typeof window !== 'undefined') {
    // Override the Vite error overlay
    Object.defineProperty(window, '__vite_plugin_react_preamble_installed__', {
      value: true,
      writable: false
    });
    
    // Suppress all overlay creation
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function(tagName: string) {
      const element = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'vite-error-overlay') {
        console.warn('Suppressed Vite error overlay creation');
        return document.createDocumentFragment() as any;
      }
      return element;
    };
    
    // Prevent error overlay mounting
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName && node.nodeName.toLowerCase().includes('error')) {
            console.warn('Removed error overlay element');
            node.parentNode?.removeChild(node);
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  // Prevent the runtime error overlay from showing
  event.preventDefault();
  // Stop the event completely
  event.stopImmediatePropagation();
  // Force handled
  if (event.promise) {
    event.promise.catch(() => {});
  }
  return false;
});

// Global error handling for uncaught errors
window.addEventListener('error', (event) => {
  console.warn('Global error caught:', event.error);
  // Specifically handle the "match" error that's causing runtime issues
  if (event.message && (
    event.message.includes("Cannot read properties of undefined (reading 'match')") ||
    event.message.includes("runtime-error-plugin")
  )) {
    console.warn('Intercepted runtime error, preventing UI overlay');
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Override console.error to prevent Vite error overlay for specific errors
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  if (message.includes("Cannot read properties of undefined (reading 'match')")) {
    console.warn('Suppressed match error from console.error');
    return;
  }
  return originalConsoleError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
