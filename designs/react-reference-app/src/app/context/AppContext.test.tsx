import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { AppProvider, useAppState } from './AppContext';

function PrototypeScopeProbe() {
  const { appState, setAppState } = useAppState();

  return (
    <>
      <output>{appState.prototypeMode}</output>
      <button
        type="button"
        onClick={() => setAppState({ prototypeMode: 'post-mvp' })}
      >
        Show Post-MVP
      </button>
    </>
  );
}

function renderScopeProbe(search = '') {
  window.history.replaceState(null, '', `/${search}`);

  return render(
    <MemoryRouter>
      <AppProvider>
        <PrototypeScopeProbe />
      </AppProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('prototype scope', () => {
  it('starts in MVP mode', () => {
    // arrange
    renderScopeProbe();

    // act
    const scope = screen.getByRole('status');

    // assert
    expect(scope).toHaveTextContent('mvp');
  });

  it('restores Post-MVP mode from the URL', () => {
    // arrange
    renderScopeProbe('?scope=post-mvp');

    // act
    const scope = screen.getByRole('status');

    // assert
    expect(scope).toHaveTextContent('post-mvp');
  });

  it('persists Post-MVP mode in the URL', async () => {
    // arrange
    const user = userEvent.setup();
    renderScopeProbe();

    // act
    await user.click(screen.getByRole('button', { name: 'Show Post-MVP' }));

    // assert
    await waitFor(() => {
      expect(window.location.search).toBe('?scope=post-mvp');
    });
  });
});
