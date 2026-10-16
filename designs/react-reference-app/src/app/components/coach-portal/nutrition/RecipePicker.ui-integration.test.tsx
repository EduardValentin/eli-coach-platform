import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { RecipePicker } from './RecipePicker';
import { AppProvider } from '../../../context/AppContext';
import { NutritionProvider } from '../../../context/NutritionContext';

function renderPicker(currentRecipeId: string | undefined) {
  render(
    <MemoryRouter>
      <AppProvider>
        <NutritionProvider>
          <RecipePicker
            open
            onOpenChange={() => {}}
            mealRoleId="mt-snack"
            currentRecipeId={currentRecipeId}
            alternativeRecipeIds={[]}
            onPick={() => {}}
            onToggleAlt={() => {}}
          />
        </NutritionProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('the recipe picker', () => {
  it('leaves archived recipes out', () => {
    // arrange
    // act
    renderPicker(undefined);

    // assert
    expect(screen.getByRole('button', { name: 'Set Greek yogurt & oats as the meal' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Set Rice cake & yogurt stack as the meal' }),
    ).not.toBeInTheDocument();
  });

  it('keeps an archived recipe the slot already holds', () => {
    // arrange
    // act
    renderPicker('recipe-rice-cake-stack');

    // assert
    expect(screen.getByRole('article', { name: 'Rice cake & yogurt stack' })).toBeInTheDocument();
  });
});
