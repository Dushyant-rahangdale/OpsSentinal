'use client';

type CacheEnvelope<T> = {
  savedAt: string;
  data: T;
};

const safeParse = <T>(value: string | null): CacheEnvelope<T> | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as CacheEnvelope<T>;
  } catch {
    return null;
  }
};

export const readCache = <T>(key: string, maxAgeMs?: number): T | null => {
  if (typeof window === 'undefined') return null;
  const envelope = safeParse<T>(window.localStorage.getItem(key));
  if (!envelope) return null;
  if (maxAgeMs) {
    const savedAt = Date.parse(envelope.savedAt);
    if (!Number.isNaN(savedAt) && Date.now() - savedAt > maxAgeMs) {
      return null;
    }
  }
  return envelope.data;
};

export const writeCache = <T>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  const payload: CacheEnvelope<T> = {
    savedAt: new Date().toISOString(),
    data,
  };
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore quota errors
  }
};
