import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DisabledActionHint } from './DisabledActionHint';
import { Button } from './ui/button';

const REASON = 'You can send another request once this one is answered.';

function renderDisabledAction() {
  const onRequest = vi.fn();
  render(
    <DisabledActionHint reason={REASON}>
      <Button type="button" onClick={onRequest}>
        Request check-in
      </Button>
    </DisabledActionHint>,
  );

  return {
    user: userEvent.setup(),
    action: screen.getByRole('button', { name: 'Request check-in' }),
    onRequest,
  };
}

describe('DisabledActionHint', () => {
  it('keeps the action focusable and marks it disabled', async () => {
    // arrange
    const { user, action } = renderDisabledAction();

    // act
    await user.tab();

    // assert
    expect(action).toHaveFocus();
    expect(action).toBeEnabled();
    expect(action).toHaveAttribute('aria-disabled', 'true');
  });

  it('stays closed until she reaches for the action', () => {
    // arrange
    // act
    renderDisabledAction();

    // assert
    expect(screen.queryByText(REASON)).not.toBeInTheDocument();
  });

  it('opens on hover', async () => {
    // arrange
    const { user, action } = renderDisabledAction();

    // act
    await user.hover(action);

    // assert
    expect(await screen.findByText(REASON)).toBeVisible();
  });

  it('closes when the pointer leaves', async () => {
    // arrange
    const { user, action } = renderDisabledAction();
    await user.hover(action);
    await screen.findByText(REASON);

    // act
    await user.unhover(action);

    // assert
    expect(screen.queryByText(REASON)).not.toBeInTheDocument();
  });

  it('opens on a tap', async () => {
    // arrange
    const { user, action } = renderDisabledAction();

    // act
    await user.pointer({ keys: '[TouchA]', target: action });

    // assert
    expect(await screen.findByText(REASON)).toBeInTheDocument();
  });

  it('opens on keyboard focus and describes the action by its reason', async () => {
    // arrange
    const { user, action } = renderDisabledAction();

    // act
    await user.tab();

    // assert
    expect(await screen.findByText(REASON)).toBeInTheDocument();
    expect(action).toHaveAccessibleDescription(REASON);
  });

  it('closes on Escape', async () => {
    // arrange
    const { user, action } = renderDisabledAction();
    await user.tab();
    await screen.findByText(REASON);

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(screen.queryByText(REASON)).not.toBeInTheDocument();
    expect(action).not.toHaveAccessibleDescription(REASON);
  });

  it('closes when focus leaves the action', async () => {
    // arrange
    const { user } = renderDisabledAction();
    await user.tab();
    await screen.findByText(REASON);

    // act
    act(() => (document.activeElement as HTMLElement).blur());

    // assert
    expect(screen.queryByText(REASON)).not.toBeInTheDocument();
  });

  it('does nothing when clicked', async () => {
    // arrange
    const { user, action, onRequest } = renderDisabledAction();

    // act
    await user.click(action);

    // assert
    expect(onRequest).not.toHaveBeenCalled();
    expect(screen.getByText(REASON)).toBeInTheDocument();
  });

  it.each([['Enter', '{Enter}'], ['Space', ' ']])('does nothing on %s', async (_key, keys) => {
    // arrange
    const { user, onRequest } = renderDisabledAction();
    await user.tab();

    // act
    await user.keyboard(keys);

    // assert
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('marks its reason for parity', async () => {
    // arrange
    const { user, action } = renderDisabledAction();

    // act
    await user.hover(action);

    // assert
    expect(
      (await screen.findByText(REASON)).closest('[data-parity="disabled-action-hint"]'),
    ).not.toBeNull();
  });
});
