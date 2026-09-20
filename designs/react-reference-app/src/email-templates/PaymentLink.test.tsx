import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentLink, type PaymentLinkProps } from './PaymentLink';

const CHOOSE_URL = 'https://evoa.fit/select-bundle?token=pl-1';
const TERMS_URL = 'https://evoa.fit/terms';
const CONTACT_HREF = 'mailto:contact@evoa.fit';

// The template renders a whole document, so it is rendered the way the preview
// surface renders it and the resulting markup is mounted, letting queries run
// against the accessibility tree a mail client would build.
async function mountPaymentLink(props: PaymentLinkProps) {
  const html = await renderEmail(
    <PaymentLink chooseUrl={CHOOSE_URL} termsUrl={TERMS_URL} {...props} />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

function linkTargets() {
  return screen.getAllByRole('link').map((link) => link.getAttribute('href'));
}

describe('PaymentLink', () => {
  it('lists the three bundles at regular pricing behind one action', async () => {
    // arrange
    const props: PaymentLinkProps = { variant: 'regular' };

    // act
    await mountPaymentLink(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: /let's get you started/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('link', { name: 'Choose your bundle' }),
    ).toHaveAttribute('href', CHOOSE_URL);
    expect(linkTargets()).toEqual([CHOOSE_URL, TERMS_URL, CONTACT_HREF]);
    expect(screen.getByText('€159 per month')).toBeInTheDocument();
    expect(screen.getByText('€149 per month')).toBeInTheDocument();
    expect(screen.getByText('€139 per month')).toBeInTheDocument();
    expect(screen.getByText('€447 in total')).toBeInTheDocument();
    expect(screen.getByText('€834 in total')).toBeInTheDocument();
  });

  it('shows the reduced prices when that is what the visitor was offered', async () => {
    // arrange
    const props: PaymentLinkProps = { variant: 'reduced' };

    // act
    await mountPaymentLink(props);

    // assert
    expect(screen.getByText('€139 per month')).toBeInTheDocument();
    expect(screen.getByText('€125 per month')).toBeInTheDocument();
    expect(screen.getByText('€119 per month')).toBeInTheDocument();
    expect(screen.getByText('€375 in total')).toBeInTheDocument();
    expect(screen.getByText('€714 in total')).toBeInTheDocument();
    expect(screen.queryByText('€159 per month')).not.toBeInTheDocument();
  });

  it('says in one line that a bundle is a subscription and that the terms apply', async () => {
    // arrange
    const props: PaymentLinkProps = {};

    // act
    await mountPaymentLink(props);

    // assert
    expect(
      screen.getByText(/renews at its own length — every 1, 3 or 6 months/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read the terms' })).toHaveAttribute(
      'href',
      TERMS_URL,
    );
  });

  it('addresses the visitor and signs off as the coach it was given', async () => {
    // arrange
    const props: PaymentLinkProps = { clientName: 'Sofia', coachName: 'Marta' };

    // act
    await mountPaymentLink(props);

    // assert
    expect(screen.getByText('Hi Sofia,')).toBeInTheDocument();
    expect(screen.getByText('— Marta')).toBeInTheDocument();
  });

  it.each([
    ['regular', 'Your coaching bundles — pick the one that fits.'],
    ['reduced', 'Your reduced prices are ready.'],
  ] as const)(
    'declares language, direction and the %s send’s subject line',
    async (variant, subject) => {
      // arrange
      const props: PaymentLinkProps = { variant };

      // act
      const parsed = await mountPaymentLink(props);

      // assert
      // Read through the DOM directly: jest-dom's element matchers reject
      // nodes from a DOMParser document, which has no defaultView.
      expect(parsed.documentElement.getAttribute('lang')).toBe('en');
      expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
      expect(parsed.title).toBe(subject);
    },
  );
});
