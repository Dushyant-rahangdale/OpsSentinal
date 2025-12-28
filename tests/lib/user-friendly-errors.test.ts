import { describe, it, expect } from 'vitest';
import { getUserFriendlyError, getSuccessMessage } from '@/lib/user-friendly-errors';

describe('User-Friendly Error Messages', () => {
  describe('getUserFriendlyError', () => {
    it('should translate Unique constraint errors', () => {
      const error = 'Unique constraint failed on the fields: (`email`)';
      expect(getUserFriendlyError(error)).toBe(
        'A user with this email already exists. Please use a different email address.'
      );
    });

    it('should translate key constraint errors', () => {
      const error = 'Unique constraint failed on the fields: (`key`)';
      expect(getUserFriendlyError(error)).toBe(
        'This key is already in use. Please choose a different one.'
      );
    });

    it('should translate Foreign key constraint errors', () => {
      const error = 'Foreign key constraint failed on the field: (`serviceId`)';
      expect(getUserFriendlyError(error)).toBe(
        'The selected item is invalid or no longer exists. Please refresh the page and try again.'
      );
    });

    it('should translate Record not found errors', () => {
      const error = 'Record to update does not exist.';
      expect(getUserFriendlyError(error)).toBe(
        'The item you are trying to update does not exist. It may have been deleted.'
      );
    });

    it('should translate Unauthorized errors', () => {
      const error = 'Unauthorized';
      expect(getUserFriendlyError(error)).toContain(
        'You do not have permission to perform this action'
      );
    });

    it('should translate not found errors', () => {
      const error = 'Incident not found';
      expect(getUserFriendlyError(error)).toContain(
        'could not be found'
      );
    });

    it('should translate network errors', () => {
      const error = 'Failed to fetch';
      expect(getUserFriendlyError(error)).toContain(
        'Unable to connect to the server'
      );
    });

    it('should translate timeout errors', () => {
      const error = 'Request timeout';
      expect(getUserFriendlyError(error)).toBe(
        'The request took too long to complete. Please try again.'
      );
    });

    it('should translate Internal Server Error', () => {
      const error = 'Internal Server Error';
      expect(getUserFriendlyError(error)).toContain(
        'An unexpected error occurred'
      );
    });

    it('should return original message if no match found', () => {
      const error = 'Some custom error message';
      expect(getUserFriendlyError(error)).toBe(error);
    });

    it('should handle Error objects', () => {
      const error = new Error('Unique constraint failed on the fields: (`email`)');
      expect(getUserFriendlyError(error)).toContain(
        'A user with this email already exists'
      );
    });

    it('should handle unknown error types', () => {
      const error = { message: 'Some error' };
      expect(getUserFriendlyError(error)).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('getSuccessMessage', () => {
    it('should return success message for create action', () => {
      expect(getSuccessMessage('create', 'Incident')).toBe('Incident created successfully.');
    });

    it('should return success message for update action', () => {
      expect(getSuccessMessage('update', 'User')).toBe('User updated successfully.');
    });

    it('should return success message for delete action', () => {
      expect(getSuccessMessage('delete', 'Service')).toBe('Service deleted successfully.');
    });

    it('should return success message for invite action', () => {
      expect(getSuccessMessage('invite', 'User')).toBe('Invitation sent to user successfully.');
    });

    it('should return success message for assign action', () => {
      expect(getSuccessMessage('assign', 'Incident')).toBe('Assigned successfully.');
    });

    it('should return success message for resolve action', () => {
      expect(getSuccessMessage('resolve', 'Incident')).toBe('Incident resolved successfully.');
    });

    it('should return success message for acknowledge action', () => {
      expect(getSuccessMessage('acknowledge', 'Incident')).toBe('Incident acknowledged successfully.');
    });

    it('should return generic message for unknown action', () => {
      expect(getSuccessMessage('unknown', 'Item')).toBe('unknown completed successfully.');
    });
  });
});


