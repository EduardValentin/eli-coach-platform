import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPortalRoute } from '../../../test/renderPortalRoute';
import { ClientProgramDocument } from './ClientProgramDocument';

const WEDNESDAY_OF_WEEK_ONE = new Date(2026, 8, 23, 10);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(WEDNESDAY_OF_WEEK_ONE);
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function renderDocumentRoute(path: string, query = '&pseed=published') {
  renderPortalRoute(
    `${path}?session=client&jstage=program-ready${query}`,
    <>
      <Route element={<ClientProgramDocument />} path="/portal/program/document" />
      <Route element={<ClientProgramDocument />} path="/portal/program/document/:version" />
      <Route element={<p>program page</p>} path="/portal/program" />
    </>,
  );
}

describe('the client program document opened by direct link', () => {
  it('shows the current version once the program is seeded', async () => {
    // arrange
    renderDocumentRoute('/portal/program/document');

    // act
    const heading = await screen.findByRole('heading', { level: 1 });

    // assert
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText('program page')).toBeNull();
  });

  it('shows a published version opened by direct link', async () => {
    // arrange
    renderDocumentRoute('/portal/program/document/1');

    // act
    const heading = await screen.findByRole('heading', { level: 1 });

    // assert
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText('program page')).toBeNull();
  });

  it('offers a skip link to the document, the way back and the print action', async () => {
    // arrange
    renderDocumentRoute('/portal/program/document');

    // act
    const main = await screen.findByRole('main');

    // assert
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', `#${main.id}`);
    expect(screen.getByRole('link', { name: 'Back to your program' })).toHaveAttribute('href', '/portal/program');
    expect(screen.getByRole('button', { name: 'Print or save as PDF' })).toBeInTheDocument();
    expect(screen.getByText('Your log prints with the PDF: each training day gets a page with a pink column. Fill it in by hand and photograph it for your check-in form.')).toBeInTheDocument();
  });

  it('says a version that does not exist is not available instead of redirecting', async () => {
    // arrange
    renderDocumentRoute('/portal/program/document/99');

    // act
    const title = await screen.findByRole('heading', { level: 1, name: "This version isn't available" });

    // assert
    expect(title).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to your program' })).toHaveAttribute('href', '/portal/program');
    expect(screen.queryByText('program page')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Print or save as PDF' })).toBeNull();
  });

  it('says the program is on its way before version 1 is published', async () => {
    // arrange
    renderDocumentRoute('/portal/program/document', '&pseed=none');

    // act
    const title = await screen.findByRole('heading', { level: 1, name: 'Your program is on its way' });

    // assert
    expect(title).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Back to your program' })).toHaveLength(2);
    expect(screen.queryByText('program page')).toBeNull();
  });

  it('keeps the shape of the program while it loads', () => {
    // arrange
    const query = '&pseed=published&pload=loading';

    // act
    renderDocumentRoute('/portal/program/document', query);

    // assert
    expect(screen.getByRole('region', { name: 'Loading program' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('link', { name: 'Back to your program' })).toBeInTheDocument();
  });

  it('shows the document on Try again after the program could not be loaded', async () => {
    // arrange
    const user = userEvent.setup();
    renderDocumentRoute('/portal/program/document', '&pseed=published&pload=failed');
    const retry = await screen.findByRole('button', { name: 'Try again' });

    // act
    await user.click(retry);

    // assert
    expect(await screen.findByRole('button', { name: 'Print or save as PDF' })).toBeInTheDocument();
    expect(screen.queryByText("The program couldn't be loaded")).toBeNull();
  });
});
