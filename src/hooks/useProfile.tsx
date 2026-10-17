"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { OccupationId } from "@/lib/occupations";
import {
  EMPTY_PROFILE,
  buildProfile,
  hasCompletedProfileSetup,
  type WorkerProfile,
} from "@/lib/profile";
import { loadProfile, saveProfile } from "@/lib/storage";

type Ctx = {
  profile: WorkerProfile;
  ready: boolean;
  setupDone: boolean;
  setPrimary: (id: OccupationId) => void;
  toggleAdditional: (id: OccupationId) => void;
  skipSetup: () => void;
  saveNow: (next: WorkerProfile) => void;
  clearProfile: () => void;
};

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<WorkerProfile>({ ...EMPTY_PROFILE });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setReady(true);
  }, []);

  const persist = useCallback((next: WorkerProfile) => {
    const normalized = buildProfile({
      primary: next.primaryOccupation,
      additional: next.additionalOccupations,
      skipped: next.skipped,
    });
    setProfile(normalized);
    saveProfile(normalized);
  }, []);

  const setPrimary = useCallback(
    (id: OccupationId) => {
      persist({
        ...profile,
        primaryOccupation: id,
        additionalOccupations: profile.additionalOccupations.filter((x) => x !== id),
        skipped: false,
      });
    },
    [persist, profile],
  );

  const toggleAdditional = useCallback(
    (id: OccupationId) => {
      if (profile.primaryOccupation === id) return;
      const has = profile.additionalOccupations.includes(id);
      const additional = has
        ? profile.additionalOccupations.filter((x) => x !== id)
        : [...profile.additionalOccupations, id].slice(0, 4);
      persist({ ...profile, additionalOccupations: additional, skipped: false });
    },
    [persist, profile],
  );

  const skipSetup = useCallback(() => {
    persist({ ...profile, skipped: true });
  }, [persist, profile]);

  const clearProfile = useCallback(() => {
    const empty = { ...EMPTY_PROFILE, skipped: false, updatedAt: new Date().toISOString() };
    setProfile(empty);
    saveProfile(empty);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      ready,
      setupDone: hasCompletedProfileSetup(profile),
      setPrimary,
      toggleAdditional,
      skipSetup,
      saveNow: persist,
      clearProfile,
    }),
    [profile, ready, setPrimary, toggleAdditional, skipSetup, persist, clearProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
