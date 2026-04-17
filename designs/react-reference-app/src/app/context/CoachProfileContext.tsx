import { createContext, useContext, useState, ReactNode } from 'react';

export interface CoachProfile {
  name: string;
  bio: string;
  avatarUrl?: string;
}

const DEFAULT_PROFILE: CoachProfile = {
  name: 'Coach Eli',
  bio: 'I help busy women feel strong, confident, and pain-free — without the gym. ACE-certified with 7+ years coaching and 600+ client programs delivered entirely online.',
};

interface CoachProfileContextType {
  coachProfile: CoachProfile;
  updateCoachProfile(patch: Partial<CoachProfile>): void;
}

const CoachProfileContext = createContext<CoachProfileContextType | null>(null);

export function CoachProfileProvider({ children }: { children: ReactNode }) {
  const [coachProfile, setCoachProfile] = useState<CoachProfile>(DEFAULT_PROFILE);

  const updateCoachProfile = (patch: Partial<CoachProfile>) => {
    setCoachProfile(prev => ({ ...prev, ...patch }));
  };

  return (
    <CoachProfileContext.Provider value={{ coachProfile, updateCoachProfile }}>
      {children}
    </CoachProfileContext.Provider>
  );
}

export function useCoachProfile() {
  const ctx = useContext(CoachProfileContext);
  if (!ctx) throw new Error('useCoachProfile must be used within CoachProfileProvider');
  return ctx;
}
