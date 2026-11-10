import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StoreOrder, type StoreOrderProps } from './StoreOrder';

const DOWNLOAD_URL = 'https://evoa.fit/downloads#grant-1';
const CONTACT_HREF = 'mailto:contact@evoa.fit';

async function mountStoreOrder(props: StoreOrderProps) {
  const html = await renderEmail(<StoreOrder downloadUrl={DOWNLOAD_URL} {...props} />);
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('StoreOrder', () => {
  it('lists each product with its amount, free items as Free, and the total in the order currency', async () => {
    // arrange
    const props: StoreOrderProps = { variant: 'paid-and-free' };

    // act
    await mountStoreOrder(props);

    // assert
    const rows = screen.getAllByRole('row').map((row) => row.textContent);
    expect(rows).toContain('30-Day Fat Loss Plan€39.00');
    expect(rows).toContain('Nutritional Reset Plan€29.00');
    expect(rows).toContain('Hormone Harmony E-BookFREE');
    expect(rows).toContain('TOTAL (EUR)€68.00');
  });

  it('prices a dollar order in dollars', async () => {
    // arrange
    const props: StoreOrderProps = { variant: 'paid-only' };

    // act
    await mountStoreOrder(props);

    // assert
    const rows = screen.getAllByRole('row').map((row) => row.textContent);
    expect(rows).toContain('30-Day Bigger Glutes Plan$55.00');
    expect(rows).toContain('TOTAL (USD)$55.00');
    expect(rows.some((row) => row?.includes('€'))).toBe(false);
  });

  it('carries one download action and confirms her immediate-delivery request with the Terms version she accepted', async () => {
    // arrange
    const props: StoreOrderProps = {};

    // act
    await mountStoreOrder(props);

    // assert
    expect(screen.getByRole('link', { name: 'Download your order' })).toHaveAttribute('href', DOWNLOAD_URL);
    expect(
      screen.getByText(
        'You asked us to deliver right away and confirmed that this ends your 14-day right to withdraw. Your Terms & Conditions (version 1.0) are attached.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Terms & Conditions/ })).not.toBeInTheDocument();
    expect(screen.getByText('The link works for the next seven days.')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
        .filter((href) => href === DOWNLOAD_URL),
    ).toHaveLength(1);
  });

  it('points to support and to the separate Stripe receipt without calling itself an invoice', async () => {
    // arrange
    const props: StoreOrderProps = {};

    // act
    const parsed = await mountStoreOrder(props);

    // assert
    expect(screen.getByText('Stripe sends your payment receipt in a separate email.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'contact@evoa.fit' })).toHaveAttribute('href', CONTACT_HREF);
    expect(parsed.body.textContent).not.toMatch(/invoice/i);
    expect(parsed.title).toBe('Your order is confirmed — your download is inside.');
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
  });
});
