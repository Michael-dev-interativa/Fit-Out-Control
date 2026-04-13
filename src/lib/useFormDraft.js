import { useEffect, useMemo, useRef, useState } from 'react';

const DRAFT_PREFIX = 'draft:';

function toStorageKey(key) {
  return `${DRAFT_PREFIX}${key}`;
}

function readDraft(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      data: parsed.data,
      savedAt: parsed.savedAt || null,
    };
  } catch {
    return null;
  }
}

export function useFormDraft(key, initialValue) {
  const storageKey = useMemo(() => toStorageKey(key), [key]);
  const initialValueRef = useRef(initialValue);
  const initialDraft = useMemo(() => readDraft(storageKey), [storageKey]);

  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [storageKey, initialValue]);

  const [formData, setFormData] = useState(() => {
    if (initialDraft?.data) return initialDraft.data;
    return initialValueRef.current;
  });
  const [draftSavedAt, setDraftSavedAt] = useState(initialDraft?.savedAt || null);

  const hasDraft = !!draftSavedAt;

  useEffect(() => {
    setFormData(initialDraft?.data || initialValueRef.current);
    setDraftSavedAt(initialDraft?.savedAt || null);
  }, [storageKey, initialDraft]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const payload = {
          data: formData,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setDraftSavedAt(payload.savedAt);
      } catch {
        // Ignore storage quota and private mode errors.
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData, storageKey]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors.
    }
    setDraftSavedAt(null);
  };

  return {
    formData,
    setFormData,
    clearDraft,
    hasDraft,
    draftSavedAt,
  };
}
