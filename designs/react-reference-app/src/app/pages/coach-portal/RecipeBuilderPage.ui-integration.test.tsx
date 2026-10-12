import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { RecipeBuilderPage } from './RecipeBuilderPage';
import { AppProvider } from '../../context/AppContext';
import { NutritionProvider } from '../../context/NutritionContext';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function renderBuilder() {
  render(
    <MemoryRouter initialEntries={['/coach/nutrition/recipe-builder']}>
      <AppProvider>
        <NutritionProvider>
          <Routes>
            <Route path="/coach/nutrition/recipe-builder" element={<RecipeBuilderPage />} />
          </Routes>
        </NutritionProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const breakfastChip = () =>
  within(screen.getByRole('group', { name: 'Meal-time' })).getByRole('button', { name: 'Breakfast' });

describe('the recipe builder in MVP mode', () => {
  it('adds an ingredient without adding its tags', async () => {
    // arrange
    const user = renderBuilder();

    // act
    await user.click(screen.getByRole('button', { name: 'Add Oats to recipe' }));

    // assert
    expect(breakfastChip()).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows computed macros without a manual override', () => {
    // arrange
    // act
    renderBuilder();

    // assert
    expect(screen.queryByText('Override manually')).not.toBeInTheDocument();
  });
});

describe('the recipe builder in Post-MVP mode', () => {
  it('suggests the tags of an added ingredient', async () => {
    // arrange
    window.history.replaceState(null, '', '/?scope=post-mvp');
    const user = renderBuilder();

    // act
    await user.click(screen.getByRole('button', { name: 'Add Oats to recipe' }));

    // assert
    expect(breakfastChip()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Override manually')).toBeInTheDocument();
  });
});

describe("the recipe builder's food search", () => {
  it('leaves archived foods out', () => {
    // arrange
    // act
    renderBuilder();

    // assert
    expect(screen.getByRole('button', { name: 'Add Oats to recipe' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Rice cakes to recipe' })).not.toBeInTheDocument();
  });
});
