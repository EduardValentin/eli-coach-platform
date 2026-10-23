import { SIMULATED_LATENCY_MS } from './measurementService';

export type ProfileSave = 'works' | 'fails';

export const PROFILE_SAVE_OUTCOMES: readonly ProfileSave[] = ['works', 'fails'];

export async function saveClientProfile(outcome: ProfileSave): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcome === 'fails') {
    throw new Error('The profile could not be saved.');
  }
}
