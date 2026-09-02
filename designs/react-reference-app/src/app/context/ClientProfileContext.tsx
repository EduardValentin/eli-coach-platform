import { createContext, useContext, useState, ReactNode } from 'react';

// ── Types ───────────────────────────────────────────────────────────

export type Gender = 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly-active'
  | 'moderately-active'
  | 'very-active';

// First and last name are stored separately so the app can address a client by
// her first name and sort by her last one; this is the only place they are
// joined for display.
export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  'sedentary',
  'lightly-active',
  'moderately-active',
  'very-active',
];

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  'sedentary': 'Sedentary (little to no exercise)',
  'lightly-active': 'Lightly Active (1-3 days/week)',
  'moderately-active': 'Moderately Active (3-4 days/week)',
  'very-active': 'Very Active (6-7 days/week)',
};

export interface ClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  gender: Gender;
  heightDisplay: string;
  startingWeightDisplay: string;
  currentWeightDisplay: string;
  // Canonical metric values — client-facing displays derive from these via
  // the client's unit preferences (see UnitPreferencesContext + utils/units).
  heightCm: number;
  startingWeightKg: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
  primaryGoal: string;
  dailyCalories: number;
  bmr: number;
  maintenanceCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  dietaryRestrictions: string;
  coachNotes: string;
  clientNotes: string;
  avatarUrl?: string;
}

// ── Mock data ───────────────────────────────────────────────────────

const MOCK_PROFILES: Record<string, ClientProfile> = {
  'client-1': {
    id: 'client-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    age: 28,
    gender: 'Female',
    heightDisplay: "5'5\"",
    startingWeightDisplay: '150 lbs',
    currentWeightDisplay: '145.8 lbs',
    heightCm: 165.1,
    startingWeightKg: 68.04,
    currentWeightKg: 66.13,
    activityLevel: 'moderately-active',
    primaryGoal: 'Fat Loss',
    dailyCalories: 1600,
    bmr: 1450,
    maintenanceCalories: 1950,
    proteinGrams: 140,
    carbsGrams: 150,
    fatsGrams: 50,
    dietaryRestrictions: 'Dairy-free, Gluten sensitive',
    coachNotes: 'Responds well to moderate intensity. Monitor recovery during luteal phase.',
    clientNotes: '',
  },
  'c2': {
    id: 'c2',
    firstName: 'Jessica',
    lastName: 'Alba',
    email: 'jessica@example.com',
    age: 32,
    gender: 'Female',
    heightDisplay: "5'7\"",
    startingWeightDisplay: '138 lbs',
    currentWeightDisplay: '135 lbs',
    heightCm: 170.2,
    startingWeightKg: 62.6,
    currentWeightKg: 61.23,
    activityLevel: 'very-active',
    primaryGoal: 'Strength & Conditioning',
    dailyCalories: 2100,
    bmr: 1520,
    maintenanceCalories: 2000,
    proteinGrams: 150,
    carbsGrams: 200,
    fatsGrams: 65,
    dietaryRestrictions: 'None',
    coachNotes: 'PCOS — works best with lower-carb approach during luteal phase.',
    clientNotes: '',
  },
  'c3': {
    id: 'c3',
    firstName: 'Emma',
    lastName: 'Stone',
    email: 'emma@example.com',
    age: 34,
    gender: 'Female',
    heightDisplay: "5'6\"",
    startingWeightDisplay: '142 lbs',
    currentWeightDisplay: '140 lbs',
    heightCm: 167.6,
    startingWeightKg: 64.41,
    currentWeightKg: 63.5,
    activityLevel: 'moderately-active',
    primaryGoal: 'Fat Loss',
    dailyCalories: 1850,
    bmr: 1420,
    maintenanceCalories: 2150,
    proteinGrams: 130,
    carbsGrams: 170,
    fatsGrams: 55,
    dietaryRestrictions: 'Vegetarian',
    coachNotes: '',
    clientNotes: '',
  },
  'c4': {
    id: 'c4',
    firstName: 'Sarah',
    lastName: 'Jenkins',
    email: 'sarah@example.com',
    age: 26,
    gender: 'Female',
    heightDisplay: "5'4\"",
    startingWeightDisplay: '128 lbs',
    currentWeightDisplay: '130 lbs',
    heightCm: 162.6,
    startingWeightKg: 58.06,
    currentWeightKg: 58.97,
    activityLevel: 'lightly-active',
    primaryGoal: 'Muscle Building',
    dailyCalories: 2000,
    bmr: 1380,
    maintenanceCalories: 1850,
    proteinGrams: 140,
    carbsGrams: 220,
    fatsGrams: 60,
    dietaryRestrictions: 'Nut allergy',
    coachNotes: '',
    clientNotes: '',
  },
  'c5': {
    id: 'c5',
    firstName: 'Mia',
    lastName: 'Thermopolis',
    email: 'mia@example.com',
    age: 30,
    gender: 'Female',
    heightDisplay: "5'8\"",
    startingWeightDisplay: '155 lbs',
    currentWeightDisplay: '152 lbs',
    heightCm: 172.7,
    startingWeightKg: 70.31,
    currentWeightKg: 68.95,
    activityLevel: 'moderately-active',
    primaryGoal: 'Maintenance',
    dailyCalories: 2050,
    bmr: 1480,
    maintenanceCalories: 2050,
    proteinGrams: 140,
    carbsGrams: 200,
    fatsGrams: 65,
    dietaryRestrictions: '',
    coachNotes: '',
    clientNotes: '',
  },
};

// ── Context ─────────────────────────────────────────────────────────

interface ClientProfileContextType {
  profiles: Record<string, ClientProfile>;
  getProfile(clientId: string): ClientProfile | null;
  updateProfile(clientId: string, patch: Partial<ClientProfile>): void;
  clientProfile: ClientProfile | null;
  listProfiles(): ClientProfile[];
}

const ClientProfileContext = createContext<ClientProfileContextType | null>(null);

function resolveId(clientId: string): string {
  return clientId === 'c1' ? 'client-1' : clientId;
}

export function ClientProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Record<string, ClientProfile>>(MOCK_PROFILES);

  const getProfile = (clientId: string): ClientProfile | null =>
    profiles[resolveId(clientId)] ?? null;

  const updateProfile = (clientId: string, patch: Partial<ClientProfile>) => {
    const id = resolveId(clientId);
    setProfiles(prev => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, ...patch, id } };
    });
  };

  const listProfiles = (): ClientProfile[] => Object.values(profiles);

  const clientProfile = getProfile('client-1');

  return (
    <ClientProfileContext.Provider value={{ profiles, getProfile, updateProfile, clientProfile, listProfiles }}>
      {children}
    </ClientProfileContext.Provider>
  );
}

export function useClientProfile() {
  const ctx = useContext(ClientProfileContext);
  if (!ctx) throw new Error('useClientProfile must be used within ClientProfileProvider');
  return ctx;
}
