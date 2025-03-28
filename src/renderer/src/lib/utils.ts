import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const debugLog = (scope: string, message: string, data?: any) => {
  const isDebug = true; // Set to false in production builds

  if (!isDebug) return;

  const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const prefix = `[${timestamp}][${scope}]`;

  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
};

/**
 * Utility function to measure execution time of async functions
 */
export const measureTime = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    debugLog("Performance", `${name} completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    debugLog("Performance", `${name} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
};

/**
 * Simple event logging middleware for IPC calls
 */
export const logIpcEvent = (eventName: string, data?: any) => {
  debugLog("IPC", `Event: ${eventName}`, data);
};
