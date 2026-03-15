/**
 * Production-safe logging utility
 * 
 * This utility prevents console logs from appearing in production environments
 * while allowing them during development for debugging purposes.
 */

// Check if we're in production mode
const isProduction = import.meta.env.PROD;

// Define types for logger parameters
type LogParams = Parameters<typeof console.log>;
type WarnParams = Parameters<typeof console.warn>;
type ErrorParams = Parameters<typeof console.error>;
type InfoParams = Parameters<typeof console.info>;
type DebugParams = Parameters<typeof console.debug>;

// Create a logger object with methods that mirror console
export const logger = {
  log: (...args: LogParams) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  
  warn: (...args: WarnParams) => {
    if (!isProduction) {
      console.warn(...args);
    }
  },
  
  error: (...args: ErrorParams) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  info: (...args: InfoParams) => {
    if (!isProduction) {
      console.info(...args);
    }
  },
  
  debug: (...args: DebugParams) => {
    if (!isProduction) {
      console.debug(...args);
    }
  }
};

// Default export for easier imports
export default logger;