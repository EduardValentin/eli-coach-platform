import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RefundDue, type RefundDueProps } from './RefundDue';

const CLIENT_PAGE_URL = 'https://evoa.fit/coach/clients/client-1';
const PAID_AT = new Date(2026, 8, 28, 11, 30);
const CANCELLED_AT = new Date(2026, 9, 2, 18, 10);
const DUE_BY = new Date(2026, 9, 16, 18, 10);

async function mountRefundDue(props: RefundDueProps) {
  const html = await renderEmail(
    <RefundDue
      cancelledAt={CANCELLED_AT}
      clientPageUrl={CLIENT_PAGE_URL}
      dueBy={DUE_BY}
      paidAt={PAID_AT}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('RefundDue', () => {
  it('names who cancelled, the refund due and the deadline in its subject', async () => {
    // arrange
    const props: RefundDueProps = {
      clientName: 'Sofia Marin',
      refundCents: 44700,
    };

    // act
    const parsed = await mountRefundDue(props);

    // assert
    expect(parsed.title).toBe(
      'Sofia Marin cancelled — refund due €447 by 16 October',
    );
  });

  it('tells the coach what to refund, by when and why', async () => {
    // arrange
    const props: RefundDueProps = {
      clientName: 'Sofia Marin',
      clientEmail: 'sofia@example.com',
      refundCents: 44700,
    };

    // act
    await mountRefundDue(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'A refund is due.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sofia Marin')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'sofia@example.com' }),
    ).toHaveAttribute('href', 'mailto:sofia@example.com');
    expect(screen.getByText('€447')).toBeInTheDocument();
    expect(screen.getByText('16 October')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Full refund: cancelled within the 14-day withdrawal period.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('€447 on 28 September')).toBeInTheDocument();
    expect(screen.getByText('2 October')).toBeInTheDocument();
  });

  it('links to her client page', async () => {
    // arrange
    const props: RefundDueProps = {};

    // act
    await mountRefundDue(props);

    // assert
    expect(
      screen.getByRole('link', { name: 'Open her client page' }),
    ).toHaveAttribute('href', CLIENT_PAGE_URL);
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: RefundDueProps = {};

    // act
    const parsed = await mountRefundDue(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
