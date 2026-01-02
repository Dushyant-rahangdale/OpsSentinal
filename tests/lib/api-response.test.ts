import { describe, it, expect } from 'vitest';
import { jsonOk, jsonError } from '@/lib/api-response';

describe('API Response Utilities', () => {
  describe('jsonOk', () => {
    it('should return successful JSON response with data', () => {
      const data = { message: 'Success', id: '123' };
      const response = jsonOk(data);
      
      expect(response.status).toBe(200);
    });

    it('should include correct headers', () => {
      const response = jsonOk({ test: true });
      const headers = response.headers;
      
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should serialize data correctly', async () => {
      const data = { message: 'Success', count: 42 };
      const response = jsonOk(data);
      const body = await response.json();
      
      expect(body).toEqual(data);
    });

    it('should handle null data', async () => {
      const response = jsonOk(null);
      const body = await response.json();
      
      expect(body).toBeNull();
    });

    it('should handle arrays', async () => {
      const data = [1, 2, 3];
      const response = jsonOk(data);
      const body = await response.json();
      
      expect(body).toEqual(data);
    });

    it('should allow custom status code', () => {
      const response = jsonOk({ created: true }, 201);
      
      expect(response.status).toBe(201);
    });

    it('should allow custom headers', () => {
      const response = jsonOk({ ok: true }, 200, {
        'Cache-Control': 'public, max-age=60',
      });

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    });
  });

  describe('jsonError', () => {
    it('should return error response with status and message', () => {
      const response = jsonError('Something went wrong', 500);
      
      expect(response.status).toBe(500);
    });

    it('should return error response with custom status', () => {
      const response = jsonError('Not found', 404);
      
      expect(response.status).toBe(404);
    });

    it('should include error message in response body', async () => {
      const errorMessage = 'Custom error message';
      const response = jsonError(errorMessage, 400);
      const body = await response.json();
      
      expect(body.error).toBeDefined();
      expect(typeof body.error).toBe('string');
    });

    it('should include meta data if provided', async () => {
      const meta = { field: 'email', code: 'VALIDATION_ERROR' };
      const response = jsonError('Validation failed', 400, meta);
      const body = await response.json();
      
      expect(body.meta).toEqual(meta);
    });

    it('should handle different status codes', () => {
      const statusCodes = [400, 401, 403, 404, 500];
      
      statusCodes.forEach(status => {
        const response = jsonError('Error', status);
        expect(response.status).toBe(status);
      });
    });
  });
});

