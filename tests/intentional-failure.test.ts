import { describe, it, expect } from 'vitest';

describe('Intentional Failure', () => {
  it('should fail this test deliberately', () => {
    expect(true).toBe(false);
  });
});
