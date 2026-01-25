'use client';

type CacheEnvelope<T> = {
  savedAt: string;
  data: T;
};

type EncryptedEnvelope = {
  savedAt: string;
  iv: string;
  ciphertext: string;
};

const textEncoder = typeof window !== 'undefined' ? new TextEncoder() : null;
const textDecoder = typeof window !== 'undefined' ? new TextDecoder() : null;

const CACHE_KEY_PASSPHRASE = 'mobile-cache-key-v1';

const base64Encode = (bytes: ArrayBuffer): string =>
  typeof window === 'undefined'
    ? ''
    : window.btoa(String.fromCharCode(...new Uint8Array(bytes)));

const base64Decode = (value: string): ArrayBuffer => {
  if (typeof window === 'undefined') return new ArrayBuffer(0);
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const getCryptoKey = async (): Promise<CryptoKey | null> => {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !textEncoder) {
    return null;
  }
  const rawKey = textEncoder.encode(CACHE_KEY_PASSPHRASE);
  return window.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

const encryptEnvelope = async <T>(envelope: CacheEnvelope<T>): Promise<EncryptedEnvelope | null> => {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !textEncoder) {
    return null;
  }
  const key = await getCryptoKey();
  if (!key) return null;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = textEncoder.encode(JSON.stringify(envelope));
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );
  return {
    savedAt: envelope.savedAt,
    iv: base64Encode(iv.buffer),
    ciphertext: base64Encode(ciphertextBuffer),
  };
};

const decryptEnvelope = async <T>(value: string | null): Promise<CacheEnvelope<T> | null> => {
  if (!value || typeof window === 'undefined' || !window.crypto?.subtle || !textDecoder) {
    return null;
  }
  let stored: EncryptedEnvelope;
  try {
    stored = JSON.parse(value) as EncryptedEnvelope;
  } catch {
    return null;
  }
  if (!stored.iv || !stored.ciphertext) {
    return null;
  }
  const key = await getCryptoKey();
  if (!key) return null;
  try {
    const ivBuffer = base64Decode(stored.iv);
    const ciphertextBuffer = base64Decode(stored.ciphertext);
    const plaintextBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
      key,
      ciphertextBuffer
    );
    const json = textDecoder.decode(plaintextBuffer);
    return JSON.parse(json) as CacheEnvelope<T>;
  } catch {
    return null;
  }
};

export const readCache = async <T>(key: string, maxAgeMs?: number): Promise<T | null> => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  const envelope = await decryptEnvelope<T>(raw);
  if (!envelope) return null;
  if (maxAgeMs) {
    const savedAt = Date.parse(envelope.savedAt);
    if (!Number.isNaN(savedAt) && Date.now() - savedAt > maxAgeMs) {
      return null;
    }
  }
  return envelope.data;
};

export const writeCache = async <T>(key: string, data: T): Promise<void> => {
  if (typeof window === 'undefined') return;
  const payload: CacheEnvelope<T> = {
    savedAt: new Date().toISOString(),
    data,
  };
  try {
    const encrypted = await encryptEnvelope(payload);
    if (!encrypted) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(encrypted));
  } catch {
    // Ignore quota or crypto errors
  }
};
