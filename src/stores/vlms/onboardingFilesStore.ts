/**
 * Onboarding Files Store
 * Temporary store for staging documents and photos during vehicle onboarding.
 * Files are uploaded to Supabase Storage after the vehicle record is created.
 */

import { create } from 'zustand';

interface OnboardingFilesState {
  stagedDocuments: File[];
  stagedPhotos: File[];
  addDocuments: (files: File[]) => void;
  addPhotos: (files: File[]) => void;
  removeDocument: (index: number) => void;
  removePhoto: (index: number) => void;
  reset: () => void;
}

export const useOnboardingFilesStore = create<OnboardingFilesState>((set) => ({
  stagedDocuments: [],
  stagedPhotos: [],

  addDocuments: (files) =>
    set((state) => ({
      stagedDocuments: [...state.stagedDocuments, ...files],
    })),

  addPhotos: (files) =>
    set((state) => ({
      stagedPhotos: [...state.stagedPhotos, ...files],
    })),

  removeDocument: (index) =>
    set((state) => ({
      stagedDocuments: state.stagedDocuments.filter((_, i) => i !== index),
    })),

  removePhoto: (index) =>
    set((state) => ({
      stagedPhotos: state.stagedPhotos.filter((_, i) => i !== index),
    })),

  reset: () => set({ stagedDocuments: [], stagedPhotos: [] }),
}));
