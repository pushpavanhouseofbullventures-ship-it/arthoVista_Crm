import { useState, useEffect, useCallback } from 'react';
import { seedBenefits } from '../data/seedBenefits';

const BENEFITS_STORAGE_KEY = 'enego.benefits.v1';

function loadInitialBenefits() {
  try {
    const raw = localStorage.getItem(BENEFITS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Could not read benefits from localStorage:', err);
  }
  return seedBenefits;
}

export function useBenefits() {
  const [benefits, setBenefits] = useState(loadInitialBenefits);

  useEffect(() => {
    try {
      localStorage.setItem(BENEFITS_STORAGE_KEY, JSON.stringify(benefits));
    } catch (err) {
      console.error('Could not save benefits to localStorage:', err);
    }
  }, [benefits]);

  const addBenefit = useCallback((benefit) => {
    setBenefits((prev) => {
      const nextSrNo = prev.length > 0 ? Math.max(...prev.map((b) => b.sr_no || 0)) + 1 : 1;
      return [...prev, { ...benefit, sr_no: benefit.sr_no || nextSrNo }];
    });
  }, []);

  const updateBenefit = useCallback((sr_no, updates) => {
    setBenefits((prev) => prev.map((b) => (b.sr_no === sr_no ? { ...b, ...updates } : b)));
  }, []);

  const deleteBenefit = useCallback((sr_no) => {
    setBenefits((prev) => prev.filter((b) => b.sr_no !== sr_no));
  }, []);

  const resetBenefits = useCallback(() => {
    setBenefits(seedBenefits);
    try {
      localStorage.removeItem(BENEFITS_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return {
    benefits,
    addBenefit,
    updateBenefit,
    deleteBenefit,
    resetBenefits,
  };
}
