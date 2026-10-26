import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { FoodTable } from './FoodTable';
import { AppProvider } from '../../../context/AppContext';
import { NutritionProvider, type Food } from '../../../context/NutritionContext';

const QUINOA: Food = {
  id: 'food-quinoa',
  name: 'Quinoa',
  category: 'carb',
  icon: 'grain',
  kcal: 120,
  protein: 4.4,
  carb: 21.3,
  fat: 1.9,
  defaultPortionGrams: 150,
  tagIds: ['di-lactose-free', 'cp-luteal', 'mt-lunch'],
};

describe('the food table', () => {
  it('shows a food’s tag pills in the vocabulary’s order, whatever order they were chosen in', () => {
    // arrange
    render(
      <MemoryRouter>
        <AppProvider>
          <NutritionProvider>
            <FoodTable
              foods={[QUINOA]}
              sort={{ key: 'name', direction: 'asc' }}
              onSort={() => {}}
              actionsFor={() => null}
              empty={null}
            />
          </NutritionProvider>
        </AppProvider>
      </MemoryRouter>,
    );

    // act
    const [, row] = screen.getAllByRole('row');

    // assert
    expect(within(row).getAllByRole('listitem').map((pill) => pill.textContent)).toEqual([
      'Lunch',
      'Luteal',
      'Lactose-free',
    ]);
  });
});
