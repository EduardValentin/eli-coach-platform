import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Book } from './Book';
import { AppProvider } from '../context/AppContext';
import { CheckinProvider } from '../context/CheckinContext';

// The step-1 control is the whole reason this flow can complete: it used to be
// passed to DateTimePicker, which never declared it, so the props were dropped
// and the visitor dead-ended after choosing a time.
function renderBook() {
  window.history.replaceState({}, '', '/book');

  return render(
    <MemoryRouter initialEntries={['/book']}>
      <AppProvider>
        <CheckinProvider>
          <Book />
        </CheckinProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

const stepControl = () =>
  screen.getByRole('button', { name: /continue to your details|select a date and time/i });

async function chooseFirstAvailableSlot(user: ReturnType<typeof userEvent.setup>) {
  // react-day-picker renders each day as button[name="day"].
  const day = document.querySelector<HTMLButtonElement>(
    'button[name="day"]:not([disabled])',
  );
  await user.click(day!);
  const slots = await screen.findAllByRole('button', { name: /\d{1,2}:\d{2}\s(AM|PM)/ });
  await user.click(slots[0]);
}

describe('Book', () => {
  it('keeps the step control disabled until a date and time are chosen', () => {
    // arrange
    // act
    renderBook();

    // assert
    expect(stepControl()).toBeDisabled();
    expect(stepControl()).toHaveAccessibleName(/select a date and time/i);
  });

  it('advances to the details step once a slot is chosen', async () => {
    // arrange
    const user = userEvent.setup();
    renderBook();

    // act
    await chooseFirstAvailableSlot(user);
    await user.click(stepControl());

    // assert
    expect(
      await screen.findByRole('heading', { name: /almost there/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });
});
