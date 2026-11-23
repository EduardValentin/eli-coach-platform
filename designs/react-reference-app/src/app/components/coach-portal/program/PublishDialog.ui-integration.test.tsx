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

function publishDialog(version = 1): HTMLElement {
  return screen.getByRole('dialog', { name: `Publish version ${version}` });
}

async function choose(user: User, combobox: HTMLElement, option: string) {
  await user.click(combobox);
  await user.click(screen.getByRole('option', { name: option }));
}

async function emptyFirstBlock(user: User) {
  await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
  await choose(user, screen.getByRole('combobox', { name: 'Split' }), 'Upper / Lower');
  await user.click(within(screen.getByRole('alertdialog', { name: 'Change the split?' })).getByRole('button', { name: 'Rebuild sessions' }));
}

describe('PublishDialog', () => {
  it('blocks publishing with an empty first block and lists the problem', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await emptyFirstBlock(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    // assert
    const sheet = publishDialog();
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
    await user.click(within(publishDialog()).getByRole('button', { name: /^Foundation block 1 has sessions without exercises/ }));

    // assert
    expect(screen.queryByRole('dialog', { name: 'Publish version 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Foundation' })).toBeInTheDocument();
  });

  it('publishes version 1, marks the journey program-ready and returns to the program page', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await user.click(within(publishDialog()).getByRole('button', { name: 'Publish anyway' }));

    // assert
    expect(await screen.findByText('Program page')).toBeInTheDocument();
    expect(await screen.findByText('Version 1 published')).toBeInTheDocument();
  });

  it('publishes over warnings only after "Publish anyway"', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const sheet = publishDialog();
    expect(within(sheet).getByRole('heading', { name: 'Worth a look' })).toBeInTheDocument();
    expect(within(sheet).queryByRole('heading', { name: 'Before you can publish' })).not.toBeInTheDocument();
    expect(screen.queryByText('Program page')).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Publish anyway' }));

    // assert
    expect(await screen.findByText('Program page')).toBeInTheDocument();
  });

  it('confirms without asking for any text', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    // assert
    expect(within(publishDialog()).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('publishes a later version without saying what changed', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    // act
    await user.click(within(publishDialog(3)).getByRole('button', { name: /^Publish/ }));

    // assert
    expect(await screen.findByText('Version 3 published')).toBeInTheDocument();
  });

  it('holds publishing until the start date on the waiting path and says why', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved&jstart=waiting');
    const publish = screen.getByRole('button', { name: 'Publish' });
    expect(publish).toHaveAttribute('aria-disabled', 'true');

    // act
    await user.hover(publish);
    await user.click(publish);

    // assert
    expect(await screen.findByText(/^Publishing opens on \d{1,2} [A-Z][a-z]+$/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Publish version 1' })).not.toBeInTheDocument();
  });

  it('opens with focus on "Keep editing" and drops the publish promise while blocked', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await emptyFirstBlock(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    // assert
    expect(within(publishDialog()).getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    expect(within(publishDialog()).queryByText('The client sees this version as soon as you publish it.')).not.toBeInTheDocument();
  });

  it('opens with focus on "Keep editing" when publishing is open', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    // assert
    expect(within(publishDialog(3)).getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    expect(publishDialog(3)).toHaveAccessibleDescription('The client sees this version as soon as you publish it.');
  });

  it('keeps the draft and says so when publishing fails', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready&pwrite=fails');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    // act
    await user.click(within(publishDialog(3)).getByRole('button', { name: /^Publish/ }));

    // assert
    expect(within(publishDialog(3)).getByRole('alert')).toHaveTextContent('Publishing didn’t go through. Your draft is unchanged, so try again.');
    expect(screen.queryByText('Program page')).not.toBeInTheDocument();
  });
});

describe('Publishing once her coaching has ended', () => {
  const ENDED_REASON = 'Her coaching has ended, so this draft can’t be published.';

  it('keeps Publish in place, unavailable, and says why on hover', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved&jsub=ended');
    const publish = screen.getByRole('button', { name: 'Publish' });

    // act
    await user.hover(publish);

    // assert
    expect(await screen.findByText(ENDED_REASON)).toBeInTheDocument();
    expect(publish).toHaveAccessibleDescription(ENDED_REASON);
    expect(publish).toHaveAttribute('aria-disabled', 'true');
    expect(publish).not.toBeDisabled();
    expect(screen.getByText('Jane Doe · v1 draft · coaching ended')).toBeInTheDocument();
  });

  it('never opens the publish dialog from a click, Enter or Space', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved&jsub=ended');
    const publish = screen.getByRole('button', { name: 'Publish' });

    // act
    await user.click(publish);
    publish.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    // assert
    expect(publish).toHaveFocus();
    expect(screen.queryByRole('dialog', { name: 'Publish version 1' })).not.toBeInTheDocument();
  });

  it('gives the ended coaching as the reason over the start date', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved&jstart=waiting&jsub=ended');
    const publish = screen.getByRole('button', { name: 'Publish' });

    // act
    await user.hover(publish);

    // assert
    expect(await screen.findByText(ENDED_REASON)).toBeInTheDocument();
    expect(screen.queryByText(/^Publishing opens on/)).not.toBeInTheDocument();
  });

  it('keeps editing and names the problems as problems in the draft', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved&jsub=ended');
    await emptyFirstBlock(user);

    // act
    await user.click(screen.getByRole('button', { name: /^\d+ problems? in the draft$/ }));

    // assert
    const review = screen.getByRole('dialog', { name: 'Review the draft' });
    expect(within(review).getByRole('heading', { name: 'Problems in the draft' })).toBeInTheDocument();
    expect(within(review).queryByRole('heading', { name: 'Before you can publish' })).not.toBeInTheDocument();
    expect(within(review).getByRole('button', { name: /^Foundation block 1 has sessions without exercises/ })).toBeInTheDocument();
  });

  it('still previews the draft as the client sees it', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved&jsub=ended');

    // act
    await user.click(screen.getByRole('button', { name: 'Preview as client' }));

    // assert
    expect(screen.getByRole('dialog', { name: 'Preview as client' })).toBeInTheDocument();
  });
});
