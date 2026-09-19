import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';
import { CoachSettings } from './CoachSettings';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/coach/settings']}>
      <AppProvider>
        <AssessmentCallProvider>
          <UnitPreferencesProvider>
            <CoachSettings />
          </UnitPreferencesProvider>
        </AssessmentCallProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('CoachSettings', () => {
  it('renders a single page heading', () => {
    // arrange
    // act
    renderPage();

    // assert
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Settings');
  });

  it('summarises what the page manages', () => {
    // arrange
    // act
    renderPage();

    // assert
    expect(
      screen.getByText('Manage how you take assessment calls and how measurements are shown.'),
    ).toBeInTheDocument();
  });

  it('places Assessment calls before Units & Measurements', () => {
    // arrange
    // act
    renderPage();

    // assert
    const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
    expect(sectionHeadings.map((heading) => heading.textContent)).toEqual([
      'Assessment calls',
      'Units & Measurements',
    ]);
  });

  it('keeps the device footnote beneath the units section', () => {
    // arrange
    // act
    renderPage();

    // assert
    expect(screen.getByText('Preferences are saved to this device.')).toBeInTheDocument();
  });
});
