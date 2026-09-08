'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<{ success: boolean; error?: string }>;
  delay?: number;
  enabled?: boolean;
}

function serializeSnapshot<T>(value: T): string {
  return JSON.stringify(value);
}

/**
 * Autosave with a serialized latest-write-wins queue.
 *
 * Important guarantees:
 * - only one persistence request is in flight at a time, so an older request cannot
 *   overwrite a newer request by completing late;
 * - the committed snapshot advances only after a successful save;
 * - edits made while a request is in flight are queued and persisted immediately
 *   after the current request completes;
 * - retry always persists the latest visible value;
 * - pending changes are flushed on React unmount where possible and browser unload
 *   is guarded so a user is not silently allowed to discard an unsaved edit.
 */
export function useAutosave<T>({
  data,
  onSave,
  delay = 500,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const currentSnapshot = serializeSnapshot(data);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<T>(data);
  const latestSnapshotRef = useRef(currentSnapshot);
  const committedSnapshotRef = useRef(currentSnapshot);
  const onSaveRef = useRef(onSave);
  const enabledRef = useRef(enabled);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const operationGenerationRef = useRef(0);

  // Keep the values consumed by async queue work synchronized on every render.
  // The scheduling effect intentionally depends on the serialized snapshot rather
  // than object identity, so equivalent object instances do not restart debounce.
  latestDataRef.current = data;
  latestSnapshotRef.current = currentSnapshot;
  onSaveRef.current = onSave;
  enabledRef.current = enabled;

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const drainQueue = useCallback(async () => {
    if (!enabledRef.current || inFlightRef.current) return;

    inFlightRef.current = true;
    clearDebounce();
    clearIdleTimer();

    try {
      while (
        enabledRef.current &&
        committedSnapshotRef.current !== latestSnapshotRef.current
      ) {
        const snapshotData = latestDataRef.current;
        const snapshotKey = latestSnapshotRef.current;
        const generation = ++operationGenerationRef.current;

        if (mountedRef.current) {
          setStatus('saving');
          setError(null);
          setHasPendingChanges(true);
        }

        let result: { success: boolean; error?: string };
        try {
          result = await onSaveRef.current(snapshotData);
        } catch (saveError) {
          result = {
            success: false,
            error: saveError instanceof Error ? saveError.message : 'Failed to save',
          };
        }

        if (!result.success) {
          if (mountedRef.current && generation === operationGenerationRef.current) {
            setStatus('error');
            setError(result.error || 'Failed to save');
            setHasPendingChanges(true);
          }
          return;
        }

        committedSnapshotRef.current = snapshotKey;
      }

      if (
        mountedRef.current &&
        committedSnapshotRef.current === latestSnapshotRef.current
      ) {
        const generation = operationGenerationRef.current;
        setHasPendingChanges(false);
        setStatus('saved');
        idleTimerRef.current = setTimeout(() => {
          if (
            mountedRef.current &&
            generation === operationGenerationRef.current &&
            committedSnapshotRef.current === latestSnapshotRef.current
          ) {
            setStatus('idle');
          }
        }, 2000);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [clearDebounce, clearIdleTimer]);

  useEffect(() => {
    const isDirty = committedSnapshotRef.current !== latestSnapshotRef.current;
    setHasPendingChanges(isDirty);

    clearDebounce();
    clearIdleTimer();

    if (!enabled || !isDirty) {
      if (!isDirty) {
        setError(null);
        setStatus(current => (current === 'error' ? 'idle' : current));
      }
      return;
    }

    debounceRef.current = setTimeout(() => {
      void drainQueue();
    }, delay);

    return clearDebounce;
  }, [currentSnapshot, delay, enabled, drainQueue, clearDebounce, clearIdleTimer]);

  useEffect(() => {
    mountedRef.current = true;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (committedSnapshotRef.current === latestSnapshotRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      mountedRef.current = false;
      clearDebounce();
      clearIdleTimer();
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (
        enabledRef.current &&
        committedSnapshotRef.current !== latestSnapshotRef.current &&
        !inFlightRef.current
      ) {
        void drainQueue();
      }
    };
  }, [clearDebounce, clearIdleTimer, drainQueue]);

  const retry = useCallback(() => {
    clearDebounce();
    clearIdleTimer();
    void drainQueue();
  }, [clearDebounce, clearIdleTimer, drainQueue]);

  const hasUncommittedSnapshot = committedSnapshotRef.current !== currentSnapshot;

  return {
    status,
    error,
    retry,
    hasPendingChanges: hasPendingChanges || hasUncommittedSnapshot,
    isSaving: status === 'saving',
    isSaved: status === 'saved',
    hasError: status === 'error',
  };
}