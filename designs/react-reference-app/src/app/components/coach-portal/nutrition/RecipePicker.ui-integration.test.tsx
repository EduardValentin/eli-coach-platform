import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecipePicker } from './RecipePicker';
import { NutritionProvider } from '../../../context/NutritionContext';

function renderPicker(currentRecipeId: string | undefined) {
  render(
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
    </NutritionProvider>,
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
