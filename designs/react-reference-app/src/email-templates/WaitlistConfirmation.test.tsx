import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  WaitlistConfirmation,
  type WaitlistConfirmationVariant,
} from './WaitlistConfirmation';

async function mountWaitlistConfirmation(variant: WaitlistConfirmationVariant) {
  const html = await renderEmail(<WaitlistConfirmation variant={variant} />);
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);
}

describe('WaitlistConfirmation', () => {
  it('keeps the reduced-pricing round small without naming who it is for', async () => {
    // arrange
    const variant: WaitlistConfirmationVariant = 'reduced';

    // act
    await mountWaitlistConfirmation(variant);

    // assert
    expect(
      screen.getByText(
        'Thanks for jumping on the waitlist. I keep this round small on purpose — only a handful of people, so I can actually be there for each of you.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/handful of women/)).not.toBeInTheDocument();
  });
});
