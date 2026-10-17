import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, describe, expect, it } from 'vitest';
import { FoodLibrary } from './FoodLibrary';
import { AppProvider } from '../../../context/AppContext';
import { ClientProfileProvider } from '../../../context/ClientProfileContext';
import { NutritionProvider } from '../../../context/NutritionContext';

type User = ReturnType<typeof userEvent.setup>;

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function FoodEditorStandIn() {
  const { pathname, state } = useLocation();
  return (
    <p data-testid="editor">
      {pathname} {(state as { library?: string } | null)?.library}
    </p>
  );
}

function renderLibrary(path = '/coach/nutrition'): User {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <ClientProfileProvider>
          <NutritionProvider>
            <Routes>
              <Route path="/coach/nutrition" element={<FoodLibrary tabs={null} />} />
              <Route path="/coach/nutrition/foods/:foodId" element={<FoodEditorStandIn />} />
            </Routes>
            <Toaster />
          </NutritionProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const catalog = () => screen.getByRole('table');

async function chooseAction(user: User, foodName: string, action: string) {
  await user.click(screen.getByRole('button', { name: `Actions for ${foodName}` }));
  await user.click(screen.getByRole('menuitem', { name: action }));
}

async function chooseStatus(user: User, status: 'Active' | 'Archived') {
  await user.click(screen.getByRole('combobox', { name: 'Status' }));
  await user.click(screen.getByRole('option', { name: new RegExp(status) }));
}

describe('the food library in MVP mode', () => {
  it('shows the catalog without the tag board and swap group views', () => {
    // arrange
    // act
    renderLibrary();

    // assert
    expect(screen.queryByRole('group', { name: 'Food library view' })).not.toBeInTheDocument();
    expect(within(catalog()).getByText('Chicken breast')).toBeInTheDocument();
  });

  it('offers the view switcher in Post-MVP mode', () => {
    // arrange
    window.history.replaceState(null, '', '/?scope=post-mvp');

    // act
    renderLibrary();

    // assert
    expect(screen.getByRole('group', { name: 'Food library view' })).toBeInTheDocument();
  });
});

describe('editing a food', () => {
  it('opens its editor page carrying the library address', async () => {
    // arrange
    const user = renderLibrary('/coach/nutrition?tab=foods&category=protein');

    // act
    await chooseAction(user, 'Chicken breast', 'Edit');

    // assert
    expect(screen.getByTestId('editor')).toHaveTextContent('/coach/nutrition/foods/food-chicken ?tab=foods&category=protein');
  });
});

describe('the food library filters', () => {
  it('narrows the catalog to the chosen categories', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('button', { name: 'Category' }));
    await user.click(screen.getByRole('checkbox', { name: /^Fat/ }));
    await user.keyboard('{Escape}');

    // assert
    expect(within(catalog()).getByText('Olive oil')).toBeInTheDocument();
    expect(within(catalog()).queryByText('Chicken breast')).not.toBeInTheDocument();
  });

  it('offers to clear the filters when nothing matches', async () => {
    // arrange
    const user = renderLibrary('/coach/nutrition?q=zzz');
    expect(screen.getByText('No foods match')).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(within(catalog()).getByText('Chicken breast')).toBeInTheDocument();
  });

  it('sorts from the column header', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('button', { name: 'kcal' }));

    // assert
    const firstRow = within(catalog()).getAllByRole('row')[1];
    expect(within(firstRow).getByText('Turmeric')).toBeInTheDocument();
  });
});

describe('archiving a food', () => {
  it('takes it out of the catalog', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseAction(user, 'Dark chocolate', 'Archive');

    // assert
    expect(within(catalog()).queryByText('Dark chocolate')).not.toBeInTheDocument();
    expect(await screen.findByText('"Dark chocolate" archived')).toBeInTheDocument();
  });

  it('shows it under Archived, where Restore brings it back', async () => {
    // arrange
    const user = renderLibrary();
    await chooseAction(user, 'Dark chocolate', 'Archive');
    await chooseStatus(user, 'Archived');

    // act
    await chooseAction(user, 'Dark chocolate', 'Restore');
    await chooseStatus(user, 'Active');

    // assert
    expect(within(catalog()).getByText('Dark chocolate')).toBeInTheDocument();
  });

  it('lists only archived foods under Archived', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseStatus(user, 'Archived');

    // assert
    expect(within(catalog()).getByText('Rice cakes')).toBeInTheDocument();
    expect(within(catalog()).queryByText('Chicken breast')).not.toBeInTheDocument();
  });
});

describe('deleting a food', () => {
  it('marks a food a recipe uses and counts the recipes', async () => {
    // arrange
    const user = renderLibrary();
    await user.click(screen.getByRole('button', { name: 'Actions for Olive oil' }));

    // act
    await user.hover(screen.getByRole('menuitem', { name: 'Delete' }));

    // assert
    expect(await screen.findByText('Used in 2 recipes')).toBeInTheDocument();
  });

  it('is unavailable while a recipe uses it', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('button', { name: 'Actions for Chicken breast' }));

    // assert
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('counts an archived recipe as a use', async () => {
    // arrange
    const user = renderLibrary();
    await chooseStatus(user, 'Archived');
    await user.click(screen.getByRole('button', { name: 'Actions for Rice cakes' }));

    // act
    await user.hover(screen.getByRole('menuitem', { name: 'Delete' }));

    // assert
    expect(await screen.findByText('Used in 1 recipe')).toBeInTheDocument();
  });

  it('removes an unused food once confirmed', async () => {
    // arrange
    const user = renderLibrary();
    await chooseAction(user, 'Dark chocolate', 'Delete');

    // act
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete “Dark chocolate”?' })).getByRole('button', {
        name: 'Delete',
      }),
    );

    // assert
    expect(within(catalog()).queryByText('Dark chocolate')).not.toBeInTheDocument();
    expect(await screen.findByText('"Dark chocolate" deleted')).toBeInTheDocument();
  });
});
