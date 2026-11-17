import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { renderPortalRoute } from '../../../test/renderPortalRoute';
import { ClientProgramDocument } from './ClientProgramDocument';

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function renderDocument(path: string, query = '') {
  renderPortalRoute(
    `${path}?session=coach&pseed=two-versions${query}`,
    <>
      <Route element={<ClientProgramDocument />} path="/coach/clients/:id/program/document/:version" />
      <Route element={<p>program page</p>} path="/coach/clients/:id/program" />
    </>,
  );
}

describe("the coach's view of a client's program document", () => {
  it('shows a published version with the way back to her program and the print action', async () => {
    // arrange
    renderDocument('/coach/clients/c1/program/document/2');

    // act
    const print = await screen.findByRole('button', { name: 'Print or save as PDF' });

    // assert
    expect(print).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Back to Jane's program" })).toHaveAttribute('href', '/coach/clients/c1/program');
  });

  it('says a draft gets its document once it is published', async () => {
    // arrange
    renderDocument('/coach/clients/c1/program/document/3');

    // act
    const title = await screen.findByRole('heading', { level: 1, name: 'A draft gets its document when you publish it' });

    // assert
    expect(title).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: "Back to Jane's program" })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Print or save as PDF' })).toBeNull();
  });

  it('says a version that does not exist is not available instead of redirecting', async () => {
    // arrange
    renderDocument('/coach/clients/c1/program/document/99');

    // act
    const title = await screen.findByRole('heading', { level: 1, name: "This version isn't available" });

    // assert
    expect(title).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Go to Jane's program" })).toHaveAttribute('href', '/coach/clients/c1/program');
    expect(screen.queryByText('program page')).toBeNull();
  });

  it('keeps the shape of the program while it loads', () => {
    // arrange
    const query = '&pload=loading';

    // act
    renderDocument('/coach/clients/c1/program/document/2', query);

    // assert
    expect(screen.getByRole('region', { name: 'Loading program' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('link', { name: "Back to Jane's program" })).toBeInTheDocument();
  });

  it('shows the document on Try again after the program could not be loaded', async () => {
    // arrange
    const user = userEvent.setup();
    renderDocument('/coach/clients/c1/program/document/2', '&pload=failed');
    const retry = await screen.findByRole('button', { name: 'Try again' });

    // act
    await user.click(retry);

    // assert
    expect(await screen.findByRole('button', { name: 'Print or save as PDF' })).toBeInTheDocument();
    expect(screen.queryByText("The program couldn't be loaded")).toBeNull();
  });

  it('says the client is not on the roster for an unknown client', () => {
    // arrange
    const path = '/coach/clients/nobody/program/document/1';

    // act
    renderDocument(path);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Client not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to clients' })).toHaveAttribute('href', '/coach/clients');
  });
});
