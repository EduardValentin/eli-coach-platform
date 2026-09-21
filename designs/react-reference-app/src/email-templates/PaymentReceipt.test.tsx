import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentReceipt, type PaymentReceiptProps } from './PaymentReceipt';

const CONTACT_HREF = 'mailto:contact@evoa.fit';

async function mountReceipt(props: PaymentReceiptProps) {
  const html = await renderEmail(<PaymentReceipt {...props} />);
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('PaymentReceipt', () => {
  it('confirms the purchase and promises the invitation, with no action to take', async () => {
    // arrange
    const props: PaymentReceiptProps = { variant: 'immediate' };

    // act
    await mountReceipt(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: /your place is booked/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your invitation is on its way.'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link').map((link) => link.getAttribute('href')),
    ).toEqual([CONTACT_HREF]);
  });

  it('reads back the bundle, the amount and the renewal period', async () => {
    // arrange
    const props: PaymentReceiptProps = {
      bundleLabel: '6 months',
      amount: '€834',
    };

    // act
    await mountReceipt(props);

    // assert
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('€834')).toBeInTheDocument();
    expect(screen.getByText('Renews every')).toBeInTheDocument();
    expect(screen.getAllByText('6 months')).toHaveLength(2);
  });

  it('says in plain words that an immediate start begins straight away', async () => {
    // arrange
    const props: PaymentReceiptProps = { variant: 'immediate' };

    // act
    await mountReceipt(props);

    // assert
    expect(
      screen.getByText(/start as soon as your payment cleared/i),
    ).toBeInTheDocument();
  });

  it('says in plain words that the waiting path keeps the 14-day withdrawal right', async () => {
    // arrange
    const props: PaymentReceiptProps = { variant: 'waiting' };

    // act
    await mountReceipt(props);

    // assert
    expect(
      screen.getByText(/kept your 14-day right to withdraw/i),
    ).toBeInTheDocument();
  });

  it.each([
    ['immediate', 'Payment confirmed — your coach is on it.'],
    ['waiting', 'Payment confirmed — your start date is set.'],
  ] as const)(
    'declares language, direction and the %s send’s subject line',
    async (variant, subject) => {
      // arrange
      const props: PaymentReceiptProps = { variant };

      // act
      const parsed = await mountReceipt(props);

      // assert
      expect(parsed.documentElement.getAttribute('lang')).toBe('en');
      expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
      expect(parsed.title).toBe(subject);
    },
  );
});
