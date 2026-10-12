import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { NutritionHub } from './NutritionHub';
import { AppProvider } from '../../context/AppContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { NutritionProvider } from '../../context/NutritionContext';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function renderHub(path = '/coach/nutrition') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <ClientProfileProvider>
          <NutritionProvider>
            <NutritionHub />
          </NutritionProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

const tabNames = () => screen.getAllByRole('tab').map((tab) => tab.textContent);

describe('the Nutrition page in MVP mode', () => {
  it('offers the food and recipe libraries only', () => {
    // arrange
    // act
    renderHub();

    // assert
    expect(tabNames()).toEqual(['Foods', 'Recipes']);
    expect(screen.getByText('Build your food library and recipes.')).toBeInTheDocument();
  });

  it('opens the foods when a link asks for the meal plans', () => {
    // arrange
    // act
    renderHub('/coach/nutrition?tab=plans');

    // assert
    expect(screen.getByRole('tab', { name: 'Foods' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('the Nutrition page in Post-MVP mode', () => {
  it('keeps the meal plans tab', () => {
    // arrange
    window.history.replaceState(null, '', '/?scope=post-mvp');

    // act
    renderHub('/coach/nutrition?tab=plans');

    // assert
    expect(tabNames()).toEqual(['Foods', 'Recipes', 'Meal Plans']);
    expect(screen.getByRole('tab', { name: 'Meal Plans' })).toHaveAttribute('aria-selected', 'true');
  });
});
