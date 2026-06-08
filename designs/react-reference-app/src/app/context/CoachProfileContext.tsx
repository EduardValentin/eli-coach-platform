import { createContext, useContext, useState, ReactNode } from 'react';

export interface CoachProfile {
  name: string;
  bio: string;
  avatarUrl?: string;
}

const DEFAULT_PROFILE: CoachProfile = {
  name: 'Coach Eli',
  bio: 'IFBB-certified personal trainer and nutritionist with a nutrition diploma and a glute-training specialty. I coach women to build strength, improve their nutrition, and feel more at home in their bodies — with plans built around your goals and your cycle.',
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
