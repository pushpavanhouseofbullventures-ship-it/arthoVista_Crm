import { useCallback, useEffect, useState } from 'react';
import { seedSchemes } from '../data/seedSchemes';

const STORAGE_KEY = 'enego.schemes.v1';

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Could not read schemes from localStorage:', err);
  }
  return seedSchemes;
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function useSchemes() {
  const [schemes, setSchemes] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
    } catch (err) {
      console.error('Could not save schemes to localStorage:', err);
    }
  }, [schemes]);

  const addScheme = useCallback((scheme) => {
    setSchemes((prev) => {
      let id = scheme.id?.trim() || slugify(scheme.name || 'scheme');
      let candidate = id;
      let n = 1;
      while (prev.some((s) => s.id === candidate)) {
        candidate = `${id}-${n++}`;
      }
      return [...prev, { ...scheme, id: candidate }];
    });
  }, []);

  const updateScheme = useCallback((id, updates) => {
    setSchemes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates, id } : s)));
  }, []);

  const deleteScheme = useCallback((id) => {
    setSchemes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const resetToSeed = useCallback(() => {
    setSchemes(seedSchemes);
  }, []);

  return { schemes, addScheme, updateScheme, deleteScheme, resetToSeed };
}
