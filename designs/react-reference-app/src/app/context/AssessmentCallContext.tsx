import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PrototypeBooking } from '../services/assessmentCallService';

type AssessmentCallContextType = {
  bookings: PrototypeBooking[];
  bookedStarts: Date[];
  addBooking: (booking: PrototypeBooking) => void;
  replaceBookings: (bookings: PrototypeBooking[]) => void;
};

const AssessmentCallContext = createContext<
  AssessmentCallContextType | undefined
>(undefined);

export function AssessmentCallProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<PrototypeBooking[]>([]);

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

  return (
    <AssessmentCallContext.Provider
      value={{ bookings, bookedStarts, addBooking, replaceBookings }}
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
