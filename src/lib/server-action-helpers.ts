/**
 * Helper utilities for server actions to provide consistent error handling
 * and user-friendly error messages
 */

import { getUserFriendlyError } from './user-friendly-errors';

/**
 * Wraps a server action with error handling that converts errors to user-friendly messages
 * 
 * @param action - The server action function to wrap
 * @returns A wrapped function that catches errors and returns user-friendly messages
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  action: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await action(...args);
    } catch (error: unknown) {
      // If it's already a state object with error, return it
      if (error && typeof error === 'object' && 'error' in error) {
        return {
          ...error,
          error: getUserFriendlyError((error as any).error)
        };
      }
      
      // Convert error to user-friendly message
      const friendlyMessage = getUserFriendlyError(error);
      
      // If action returns a state object, wrap error in state format
      // Otherwise, throw the friendly error
      throw new Error(friendlyMessage);
    }
  }) as T;
}

/**
 * Creates an error state object for form actions
 */
export function createErrorState(error: unknown): { error: string } {
  return {
    error: getUserFriendlyError(error)
  };
}

/**
 * Creates a success state object for form actions
 */
export function createSuccessState<T = Record<string, never>>(data?: T): { success: true } & T {
  return {
    success: true,
    ...(data || {})
  } as { success: true } & T;
}


