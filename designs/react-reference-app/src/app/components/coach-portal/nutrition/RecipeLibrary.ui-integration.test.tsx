import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Toaster } from 'sonner';
import { describe, expect, it } from 'vitest';
import { RecipeLibrary } from './RecipeLibrary';
import { AppProvider } from '../../../context/AppContext';
import { NutritionProvider } from '../../../context/NutritionContext';

function renderLibrary() {
  render(
    <MemoryRouter>
      <AppProvider>
          <NutritionProvider>
            <RecipeLibrary tabs={null} />
            <Toaster />
          </NutritionProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

async function chooseStatus(user: ReturnType<typeof userEvent.setup>, status: 'Active' | 'Archived') {
  await user.click(screen.getByRole('combobox', { name: 'Status' }));
  await user.click(screen.getByRole('option', { name: new RegExp(status) }));
}

async function chooseAction(
  user: ReturnType<typeof userEvent.setup>,
  recipeName: string,
  action: string,
) {
  await user.click(screen.getByRole('button', { name: `Actions for ${recipeName}` }));
  await user.click(screen.getByRole('menuitem', { name: action }));
}

describe('archiving a recipe', () => {
  it('takes it out of the library', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseAction(user, 'Chicken rice bowl', 'Archive');

    // assert
    expect(screen.queryByText('Chicken rice bowl')).not.toBeInTheDocument();
    expect(await screen.findByText('"Chicken rice bowl" archived')).toBeInTheDocument();
  });

  it('shows it under Archived, where Restore brings it back', async () => {
    // arrange
    const user = renderLibrary();
    await chooseAction(user, 'Chicken rice bowl', 'Archive');
    await chooseStatus(user, 'Archived');

    // act
    await chooseAction(user, 'Chicken rice bowl', 'Restore');
    await chooseStatus(user, 'Active');

    // assert
    expect(screen.getByText('Chicken rice bowl')).toBeInTheDocument();
    expect(await screen.findByText('"Chicken rice bowl" restored')).toBeInTheDocument();
  });

  it('lists only archived recipes under Archived', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseStatus(user, 'Archived');

    // assert
    expect(screen.getByText('Rice cake & yogurt stack')).toBeInTheDocument();
    expect(screen.queryByText('Chicken rice bowl')).not.toBeInTheDocument();
  });
});

describe('the recipe library filters', () => {
  it('sorts by calories through the sort control', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Sort by' }));
    await user.click(screen.getByRole('option', { name: 'Calories' }));

    // assert
    const names = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(names).toEqual(['Greek yogurt & oats', 'Chicken rice bowl', 'Salmon & sweet potato']);
  });

  it('narrows to recipes under a calorie band', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Calories' }));
    await user.click(screen.getByRole('option', { name: /Under 500 kcal/ }));

    // assert
    expect(screen.getByText('Greek yogurt & oats')).toBeInTheDocument();
    expect(screen.queryByText('Chicken rice bowl')).not.toBeInTheDocument();
  });

  it('offers to clear the filters when nothing matches', async () => {
    // arrange
    const user = renderLibrary();
    await user.click(screen.getByRole('combobox', { name: 'Calories' }));
    await user.click(screen.getByRole('option', { name: /Under 200 kcal/ }));
    expect(screen.getByText('No recipes match')).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(screen.getByText('Chicken rice bowl')).toBeInTheDocument();
  });
});

describe('deleting a recipe', () => {
  it('marks a recipe a meal plan uses and counts the meal plans', async () => {
    // arrange
    const user = renderLibrary();
    await user.click(screen.getByRole('button', { name: 'Actions for Chicken rice bowl' }));

    // act
    await user.hover(screen.getByRole('menuitem', { name: 'Delete' }));

    // assert
    expect(await screen.findByText('Used in 1 meal plan')).toBeInTheDocument();
  });

  it('is unavailable while a meal plan uses it', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('button', { name: 'Actions for Chicken rice bowl' }));

    // assert
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('removes an unused recipe once confirmed', async () => {
    // arrange
    const user = renderLibrary();
    await chooseStatus(user, 'Archived');
    await chooseAction(user, 'Rice cake & yogurt stack', 'Delete');

    // act
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete “Rice cake & yogurt stack”?' })).getByRole('button', {
        name: 'Delete',
      }),
    );

    // assert
    expect(screen.queryByText('Rice cake & yogurt stack')).not.toBeInTheDocument();
    expect(await screen.findByText('"Rice cake & yogurt stack" deleted')).toBeInTheDocument();
  });
});

describe('a recipe card', () => {
  it('shows the sample recipe photo bundled with the app', () => {
    // arrange
    // act
    renderLibrary();

    // assert
    expect(screen.getByRole('img', { name: 'Chicken rice bowl' })).toHaveAttribute(
      'src',
      expect.stringMatching(/\/media\/recipes\/chicken-rice-bowl\.jpg$/),
    );
  });
});
