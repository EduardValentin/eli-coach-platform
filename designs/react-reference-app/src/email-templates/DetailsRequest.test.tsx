import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DetailsRequest, type DetailsRequestProps } from './DetailsRequest';

const PORTAL_URL = 'https://evoa.fit/portal';
const CONTACT_HREF = 'mailto:contact@evoa.fit';

async function mountRequest(props: DetailsRequestProps) {
  const html = await renderEmail(
    <DetailsRequest portalUrl={PORTAL_URL} {...props} />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('DetailsRequest', () => {
  it('tells her Eli needs a few more details and sends her to the portal to answer', async () => {
    // arrange
    const props: DetailsRequestProps = { clientName: 'Sofia' };

    // act
    await mountRequest(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'A few more details' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Hi Sofia,')).toBeInTheDocument();
    expect(
      screen.getByText(
        "I've gone through your answers and need a few more details before I build your program. Open your portal and you'll see what I asked.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Answer now' })).toHaveAttribute(
      'href',
      PORTAL_URL,
    );
    expect(screen.getByText('— Eli')).toBeInTheDocument();
  });

  it('offers the portal as its only destination besides the contact address', async () => {
    // arrange
    const props: DetailsRequestProps = {};

    // act
    await mountRequest(props);

    // assert
    const targets = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(targets).toEqual([PORTAL_URL, CONTACT_HREF]);
  });

  it('declares language, direction and the subject line', async () => {
    // arrange
    const props: DetailsRequestProps = {};

    // act
    const parsed = await mountRequest(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
    expect(parsed.title).toBe('Eli needs a few more details');
  });
});
