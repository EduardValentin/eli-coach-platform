import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { NutritionHub } from './NutritionHub';
import { AppProvider } from '../../context/AppContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { NutritionProvider } from '../../context/NutritionContext';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function NewFoodStandIn() {
  const { state } = useLocation();
  return <p data-testid="new-food">{(state as { library?: string } | null)?.library}</p>;
}

function renderHub(path = '/coach/nutrition') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <ClientProfileProvider>
          <NutritionProvider>
            <Routes>
              <Route path="/coach/nutrition" element={<NutritionHub />} />
              <Route path="/coach/nutrition/foods/new" element={<NewFoodStandIn />} />
            </Routes>
          </NutritionProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
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

describe('the New food action', () => {
  it('opens the new-food page carrying the library address', async () => {
    // arrange
    const user = renderHub('/coach/nutrition?tab=foods');

    // act
    await user.click(screen.getByRole('link', { name: 'New food' }));

    // assert
    expect(screen.getByTestId('new-food')).toHaveTextContent('?tab=foods');
  });
});

describe('the empty food library seed', () => {
  it('starts the library with no foods', () => {
    // arrange
    window.history.replaceState(null, '', '/coach/nutrition?session=coach&nutseed=empty');

    // act
    renderHub('/coach/nutrition?session=coach&nutseed=empty');

    // assert
    expect(screen.getByText('No foods yet')).toBeInTheDocument();
    expect(screen.queryByText('Chicken breast')).not.toBeInTheDocument();
  });
});

describe('the empty nutrition library seed', () => {
  it('starts the recipes with none', () => {
    // arrange
    window.history.replaceState(null, '', '/coach/nutrition?session=coach&nutseed=empty&tab=recipes');

    // act
    renderHub('/coach/nutrition?session=coach&nutseed=empty&tab=recipes');

    // assert
    expect(screen.getByText('No recipes yet')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Chicken rice bowl' })).not.toBeInTheDocument();
  });
});

describe('moving between the Nutrition tabs', () => {
  it('keeps her keyboard on the tab she moves to with the arrow keys', async () => {
    // arrange
    const user = renderHub('/coach/nutrition?tab=foods');
    screen.getByRole('tab', { name: 'Foods' }).focus();

    // act
    await user.keyboard('{ArrowRight}');

    // assert
    expect(await screen.findByRole('tab', { name: 'Recipes', selected: true })).toHaveFocus();
  });
});

describe('the Recipes tab header', () => {
  it('links to a new recipe', () => {
    // arrange
    // act
    renderHub('/coach/nutrition?tab=recipes');

    // assert
    expect(screen.getByRole('link', { name: 'New recipe' })).toHaveAttribute(
      'href',
      '/coach/nutrition/recipe-builder',
    );
  });
});
