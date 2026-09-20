import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { AssessmentCallProvider, useAssessmentCalls } from '../context/AssessmentCallContext';
import type { PrototypeBooking } from '../services/assessmentCallService';
import { JoinCall } from './JoinCall';

const SAVE_WAIT = { timeout: 4000 };

const KNOWN_BOOKING: PrototypeBooking = {
  id: 'ac-known',
  startsAt: new Date('2026-03-02T15:00:00.000Z'),
  visitorName: 'Jane Doe',
  visitorEmail: 'jane@example.com',
  notes: '',
  visitorTimeZone: 'Europe/London',
  coachTimeZone: 'Europe/Bucharest',
  joinPath: '/book/ac-known/join',
};

function SeedKnownBooking() {
  const { addBooking } = useAssessmentCalls();

  useEffect(() => {
    addBooking(KNOWN_BOOKING);
  }, [addBooking]);

  return null;
}

function SeedKnownBookingWithMeetingLink() {
  const { addBooking, saveSettings } = useAssessmentCalls();

  useEffect(() => {
    addBooking(KNOWN_BOOKING);
    void saveSettings({
      timeZone: 'Europe/Bucharest',
      weekdays: [1, 2, 3, 4, 5],
      startHour: 17,
      endHour: 20,
      meetingLink: 'https://meet.google.com/xyz-abcd',
    });
  }, [addBooking, saveSettings]);

  return null;
}

function renderJoinCallRoute(bookingId: string, seed: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[`/book/${bookingId}/join`]}>
      <AppProvider>
        <AssessmentCallProvider>
          {seed}
          <Routes>
            <Route path="/book/:bookingId/join" element={<JoinCall />} />
            <Route path="/" element={<div>Home</div>} />
          </Routes>
        </AssessmentCallProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function renderJoinCallForUnknownBooking() {
  return renderJoinCallRoute('does-not-exist', null);
}

function renderJoinCallForBookingWithoutMeetingLink() {
  return renderJoinCallRoute('ac-known', <SeedKnownBooking />);
}

function renderJoinCallForBookingWithMeetingLink() {
  return renderJoinCallRoute('ac-known', <SeedKnownBookingWithMeetingLink />);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('JoinCall', () => {
  it('renders the standard not-found page for an unknown booking id', () => {
    // arrange
    // act
    renderJoinCallForUnknownBooking();

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('shows the call-link-not-ready page for a known booking with no meeting link set', async () => {
    // arrange
    // act
    renderJoinCallForBookingWithoutMeetingLink();

    // assert
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "Your call link isn't ready yet",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Assessment call')).toBeInTheDocument();
    expect(
      screen.getByText(
        "The meeting room for this call hasn't been set up yet. Check back before your call, or reply to your confirmation email and we'll send the link.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
  });

  it('sends the browser to the saved meeting link for a known booking', async () => {
    // arrange
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });

    // act
    renderJoinCallForBookingWithMeetingLink();

    // assert
    await waitFor(
      () => expect(assign).toHaveBeenCalledWith('https://meet.google.com/xyz-abcd'),
      SAVE_WAIT,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Taking you to your call…');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
