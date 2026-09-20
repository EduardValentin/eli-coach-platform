import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAppState } from './AppContext';
import {
  DEFAULT_ASSESSMENT_CALL_SETTINGS,
  saveAssessmentCallSettings,
  type AssessmentCallSettings,
  type PrototypeBooking,
} from '../services/assessmentCallService';

type AssessmentCallContextType = {
  bookings: PrototypeBooking[];
  bookedStarts: Date[];
  addBooking: (booking: PrototypeBooking) => void;
  replaceBookings: (bookings: PrototypeBooking[]) => void;
  settings: AssessmentCallSettings;
  saveSettings: (next: AssessmentCallSettings) => Promise<void>;
  findBooking: (id: string) => PrototypeBooking | undefined;
};

const AssessmentCallContext = createContext<
  AssessmentCallContextType | undefined
>(undefined);

export function AssessmentCallProvider({ children }: { children: ReactNode }) {
  const { appState } = useAppState();
  const [bookings, setBookings] = useState<PrototypeBooking[]>([]);
  const [settings, setSettings] = useState<AssessmentCallSettings>(
    DEFAULT_ASSESSMENT_CALL_SETTINGS,
  );

  const bookedStarts = useMemo(
    () => bookings.map((booking) => booking.startsAt),
    [bookings],
  );

  const addBooking = useCallback((booking: PrototypeBooking) => {
    setBookings((previous) => [booking, ...previous]);
  }, []);

  const replaceBookings = useCallback((replacements: PrototypeBooking[]) => {
    setBookings(replacements);
  }, []);

  const findBooking = useCallback(
    (id: string) => bookings.find((booking) => booking.id === id),
    [bookings],
  );

  const saveSettings = useCallback(
    async (next: AssessmentCallSettings) => {
      const saved = await saveAssessmentCallSettings({
        settings: next,
        outcome: appState.callSettingsSaveOutcome,
      });
      setSettings(saved);
    },
    [appState.callSettingsSaveOutcome],
  );

  return (
    <AssessmentCallContext.Provider
      value={{
        bookings,
        bookedStarts,
        addBooking,
        replaceBookings,
        settings,
        saveSettings,
        findBooking,
      }}
    >
      {children}
    </AssessmentCallContext.Provider>
  );
}

export function useAssessmentCalls() {
  const context = useContext(AssessmentCallContext);
  if (!context) {
    throw new Error(
      'useAssessmentCalls must be used within an AssessmentCallProvider',
    );
  }
  return context;
}
