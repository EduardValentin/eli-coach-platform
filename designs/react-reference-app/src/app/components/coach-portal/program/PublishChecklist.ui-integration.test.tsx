import { screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderProgramEditor, stubEditorBrowserApis } from '../../../../test/renderProgramEditor';

beforeAll(stubEditorBrowserApis);

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

type User = ReturnType<typeof userEvent.setup>;

function rail(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Program sections' });
}

function checklist(): HTMLElement {
  return screen.getByRole('dialog', { name: 'Publish checklist' });
}

async function choose(user: User, combobox: HTMLElement, option: string) {
  await user.click(combobox);
  await user.click(screen.getByRole('option', { name: option }));
}

async function emptyFirstBlock(user: User) {
  await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
  await choose(user, screen.getByRole('combobox', { name: 'Split shape' }), 'Upper / lower');
  await user.click(within(screen.getByRole('dialog', { name: 'Replace the sessions?' })).getByRole('button', { name: 'Replace sessions' }));
}

describe('PublishChecklist', () => {
  it('blocks publishing with an empty first block and lists the problem', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await emptyFirstBlock(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    // assert
    const sheet = checklist();
    expect(within(sheet).getByRole('button', { name: /^Foundation block 1 has sessions without exercises/ })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('jumps from a listed problem to its block', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await emptyFirstBlock(user);
    await user.click(within(rail()).getByRole('button', { name: /^Overview/ }));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    // act
    await user.click(within(checklist()).getByRole('button', { name: /^Foundation block 1 has sessions without exercises/ }));

    // assert
    expect(screen.queryByRole('dialog', { name: 'Publish checklist' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Foundation' })).toBeInTheDocument();
  });

  it('publishes version 1, marks the journey program-ready and returns to the program page', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await user.click(within(checklist()).getByRole('button', { name: 'Publish anyway' }));

    // assert
    expect(await screen.findByText('Program page')).toBeInTheDocument();
    expect(await screen.findByText('Version 1 published')).toBeInTheDocument();
  });

  it('publishes over warnings only after "Publish anyway"', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const sheet = checklist();
    expect(within(sheet).getByRole('heading', { name: 'Worth a look' })).toBeInTheDocument();
    expect(within(sheet).queryByRole('heading', { name: 'Before you can publish' })).not.toBeInTheDocument();
    expect(screen.queryByText('Program page')).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Publish anyway' }));

    // assert
    expect(await screen.findByText('Program page')).toBeInTheDocument();
  });

  it('holds publishing until the start date on the waiting path', () => {
    // arrange / act
    renderProgramEditor('&pseed=draft&jstage=approved&jstart=waiting');

    // assert
    expect(screen.getByText(/^Publishing opens on \d{1,2} [A-Z][a-z]+$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
});
