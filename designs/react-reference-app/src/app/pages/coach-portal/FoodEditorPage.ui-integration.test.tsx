import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, type InitialEntry } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, describe, expect, it } from 'vitest';
import { FoodEditorPage } from './FoodEditorPage';
import { AppProvider } from '../../context/AppContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { NutritionProvider, useNutrition } from '../../context/NutritionContext';

type User = ReturnType<typeof userEvent.setup>;

const NEW = '/coach/nutrition/foods/new';
const CHICKEN = '/coach/nutrition/foods/food-chicken';

function SavedFoodProbe({ name }: { name: string }) {
  const { foods } = useNutrition();
  const saved = foods.find((food) => food.name === name);
  return (
    <p data-testid="saved">
      {saved
        ? [saved.category, saved.icon, saved.kcal, saved.protein, saved.carb, saved.fat, saved.defaultPortionGrams, saved.tagIds.join('+'), saved.equivalenceGroupId ?? 'no-group'].join('|')
        : 'none'}
    </p>
  );
}

function LibraryStandIn() {
  const { search } = useLocation();
  return (
    <>
      <p>Food library</p>
      <p data-testid="library-search">{search}</p>
    </>
  );
}

function renderEditor(entry: InitialEntry, probeName = 'Chicken breast'): User {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AppProvider>
        <ClientProfileProvider>
          <NutritionProvider>
            <SavedFoodProbe name={probeName} />
            <Routes>
              <Route path="/coach/nutrition" element={<LibraryStandIn />} />
              <Route path="/coach/nutrition/foods/new" element={<FoodEditorPage />} />
              <Route path="/coach/nutrition/foods/:foodId" element={<FoodEditorPage />} />
            </Routes>
            <Toaster />
          </NutritionProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

const nameField = () => screen.getByRole('textbox', { name: 'Name (required)' });
const numberField = (name: string) => screen.getByRole('spinbutton', { name });
const primary = () => screen.getByRole('button', { name: /^(Create food|Save changes)$/ });
const iconChoice = (name: string) => within(screen.getByRole('group', { name: 'Icon' })).getByRole('button', { name });
const tagGroup = (name: string) => screen.getByRole('group', { name });

async function retype(user: User, field: HTMLElement, value: string) {
  await user.clear(field);
  if (value !== '') await user.type(field, value);
}

describe('a new food', () => {
  it('is a page titled New food with a way back, Protein, the Other icon, blank macros, a 100 g portion and a disabled Create', () => {
    // arrange
    // act
    renderEditor(NEW);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'New food' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to foods' })).toHaveAttribute('href', '/coach/nutrition');
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('Protein');
    expect(iconChoice('Other')).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: 'Icon' })).getAllByRole('button')).toHaveLength(28);
    for (const macro of ['Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)']) {
      expect(numberField(macro)).toHaveValue(null);
    }
    expect(numberField('Default portion (g)')).toHaveValue(100);
    expect(numberField('Default portion (g)')).toHaveAccessibleDescription('Proposed when the food enters a recipe.');
    expect(primary()).toHaveTextContent('Create food');
    expect(primary()).toBeDisabled();
  });

  it('groups its fields under About the food, Nutrition per 100 g and Tags', () => {
    // arrange
    // act
    renderEditor(NEW);

    // assert
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'About the food',
      'Nutrition per 100 g',
      'Tags',
    ]);
  });

  it('offers the tags in four named family groups', () => {
    // arrange
    // act
    renderEditor(NEW);

    // assert
    expect(within(tagGroup('Meal-time')).getAllByRole('checkbox')).toHaveLength(6);
    expect(within(tagGroup('Cycle phase')).getAllByRole('checkbox')).toHaveLength(4);
    expect(within(tagGroup('Nutrient / benefit')).getAllByRole('checkbox')).toHaveLength(4);
    expect(within(tagGroup('Dietary')).getAllByRole('checkbox')).toHaveLength(2);
  });

  it('keeps swap groups out of the editor', () => {
    // arrange
    window.history.replaceState(null, '', '/?scope=post-mvp');

    // act
    renderEditor(NEW);

    // assert
    expect(screen.queryByText(/Swap group/)).not.toBeInTheDocument();
  });

  it('shows no problem before the coach changes anything', () => {
    // arrange
    // act
    renderEditor(NEW);

    // assert
    expect(screen.queryByText('Give the food a name')).not.toBeInTheDocument();
    expect(nameField()).not.toHaveAttribute('aria-invalid');
  });

  it('says why Create is disabled once a typed name is cleared', async () => {
    // arrange
    const user = renderEditor(NEW);
    await user.type(nameField(), 'Quinoa');

    // act
    await user.clear(nameField());

    // assert
    const problem = screen.getByText('Give the food a name');
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(nameField()).toHaveAttribute('aria-describedby', problem.id);
    expect(primary()).toBeDisabled();
  });

  it('refuses a name longer than 80 characters', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await user.type(nameField(), 'a'.repeat(81));

    // assert
    expect(screen.getByText('Keep the name to 80 characters')).toBeInTheDocument();
    expect(primary()).toBeDisabled();
  });

  it('refuses the name of another active food whatever its case and spaces', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await user.type(nameField(), '  salmon ');

    // assert
    expect(screen.getByText('A food with this name already exists')).toBeInTheDocument();
    expect(primary()).toBeDisabled();
  });

  it('accepts the name only an archived food holds', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await user.type(nameField(), 'Rice cakes');

    // assert
    expect(screen.queryByText('A food with this name already exists')).not.toBeInTheDocument();
    expect(primary()).toBeEnabled();
  });

  it.each(['Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'])('refuses %s with three decimals or over 9,999.99', async (macro) => {
    // arrange
    const user = renderEditor(NEW);
    await user.type(nameField(), 'Quinoa');

    // act
    await user.type(numberField(macro), '1.234');
    const refusedThreeDecimals = screen.queryByText('Enter a value from 0 to 9,999.99') !== null;
    await retype(user, numberField(macro), '10000');

    // assert
    expect(refusedThreeDecimals).toBe(true);
    const problem = screen.getByText('Enter a value from 0 to 9,999.99');
    expect(numberField(macro)).toHaveAttribute('aria-invalid', 'true');
    expect(numberField(macro)).toHaveAttribute('aria-describedby', problem.id);
    expect(primary()).toBeDisabled();
  });

  it('refuses a portion that is not whole grams up to 99,999', async () => {
    // arrange
    const user = renderEditor(NEW);
    await user.type(nameField(), 'Quinoa');

    // act
    await retype(user, numberField('Default portion (g)'), '100000');

    // assert
    expect(screen.getByText('Enter whole grams up to 99,999')).toBeInTheDocument();
    expect(numberField('Default portion (g)')).toHaveAccessibleDescription(
      'Proposed when the food enters a recipe. Enter whole grams up to 99,999',
    );
    expect(primary()).toBeDisabled();
  });

  it('presses the chosen icon alone', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await user.click(iconChoice('Fish'));

    // assert
    expect(iconChoice('Fish')).toHaveAttribute('aria-pressed', 'true');
    expect(iconChoice('Other')).toHaveAttribute('aria-pressed', 'false');
  });

  it('names the icon choice list after the Icon row', () => {
    // arrange
    // act
    renderEditor(NEW);

    // assert
    expect(within(screen.getByRole('list', { name: 'Icon' })).getAllByRole('button')).toHaveLength(28);
  });

  it('toggles a tag on and off', async () => {
    // arrange
    const user = renderEditor(NEW);
    const snack = within(tagGroup('Meal-time')).getByRole('checkbox', { name: 'Snack' });

    // act
    await user.click(snack);
    const checked = (snack as HTMLInputElement).checked;
    await user.click(snack);

    // assert
    expect(checked).toBe(true);
    expect(snack).not.toBeChecked();
  });

  it('creates the food with what the coach entered and returns to the library', async () => {
    // arrange
    const user = renderEditor(NEW, 'Quinoa');
    await user.type(nameField(), '  Quinoa ');
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(screen.getByRole('option', { name: 'Carb' }));
    await user.click(iconChoice('Grain'));
    await user.type(numberField('Calories'), '120');
    await user.type(numberField('Protein (g)'), '4.4');
    await user.type(numberField('Fat (g)'), '1.92');
    await retype(user, numberField('Default portion (g)'), '');
    await user.click(within(tagGroup('Meal-time')).getByRole('checkbox', { name: 'Lunch' }));
    await user.click(within(tagGroup('Dietary')).getByRole('checkbox', { name: 'Vegetarian' }));

    // act
    await user.click(primary());

    // assert
    expect(screen.getByText('Food library')).toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent('carb|grain|120|4.4|0|1.92|100|mt-lunch+di-vegetarian|no-group');
    expect(await screen.findByText('Food created')).toBeInTheDocument();
  });
});

describe('editing a food', () => {
  it('opens Edit food with the food as saved and Save changes enabled', () => {
    // arrange
    // act
    renderEditor(CHICKEN);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Edit food' })).toBeInTheDocument();
    expect(nameField()).toHaveValue('Chicken breast');
    expect(iconChoice('Poultry')).toHaveAttribute('aria-pressed', 'true');
    expect(numberField('Calories')).toHaveValue(165);
    expect(numberField('Fat (g)')).toHaveValue(3.6);
    expect(numberField('Default portion (g)')).toHaveValue(150);
    expect(within(tagGroup('Meal-time')).getByRole('checkbox', { name: 'Lunch' })).toBeChecked();
    expect(primary()).toHaveTextContent('Save changes');
    expect(primary()).toBeEnabled();
  });

  it('keeps its own name free', async () => {
    // arrange
    const user = renderEditor(CHICKEN);

    // act
    await retype(user, nameField(), 'CHICKEN BREAST');

    // assert
    expect(screen.queryByText('A food with this name already exists')).not.toBeInTheDocument();
  });

  it('saves the changes, keeping its swap group, and returns to the library', async () => {
    // arrange
    const user = renderEditor(CHICKEN);
    await retype(user, numberField('Calories'), '170');
    await retype(user, numberField('Default portion (g)'), '0');
    await user.click(within(tagGroup('Meal-time')).getByRole('checkbox', { name: 'Lunch' }));

    // act
    await user.click(primary());

    // assert
    expect(screen.getByText('Food library')).toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent('protein|poultry|170|31|0|3.6|100|mt-dinner+mt-post-workout|eg-lean-proteins');
    expect(await screen.findByText('Food updated')).toBeInTheDocument();
  });

  it('returns to the library for an unknown food', () => {
    // arrange
    // act
    renderEditor('/coach/nutrition/foods/food-unknown');

    // assert
    expect(screen.getByText('Food library')).toBeInTheDocument();
  });
});

describe('a food save the server refuses', () => {
  it('says it could not save, stays on the editor and keeps her entries', async () => {
    // arrange
    window.history.replaceState(null, '', '/?fsave=fail');
    const user = renderEditor(NEW, 'Quinoa');
    await user.type(nameField(), 'Quinoa');
    await user.type(numberField('Calories'), '120');
    await user.type(numberField('Protein (g)'), '4.4');

    // act
    await user.click(primary());

    // assert
    expect(
      await screen.findByText("We couldn't save the food. Try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('library-search')).not.toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent('none');
    expect(nameField()).toHaveValue('Quinoa');
    expect(numberField('Calories')).toHaveValue(120);
    expect(numberField('Protein (g)')).toHaveValue(4.4);
  });
});

describe('leaving the editor', () => {
  it('discards the changes through Cancel', async () => {
    // arrange
    const user = renderEditor(CHICKEN);
    await retype(user, numberField('Calories'), '999');

    // act
    await user.click(screen.getByRole('link', { name: 'Cancel' }));

    // assert
    expect(screen.getByText('Food library')).toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent('protein|poultry|165|');
  });

  it('discards the changes through the back link', async () => {
    // arrange
    const user = renderEditor(CHICKEN);
    await retype(user, numberField('Calories'), '999');

    // act
    await user.click(screen.getByRole('link', { name: 'Back to foods' }));

    // assert
    expect(screen.getByText('Food library')).toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent('protein|poultry|165|');
  });

  it('returns to the library address it was opened from', async () => {
    // arrange
    const user = renderEditor({ pathname: CHICKEN, state: { library: '?tab=foods&category=fat' } });

    // act
    await user.click(screen.getByRole('link', { name: 'Back to foods' }));

    // assert
    expect(screen.getByTestId('library-search')).toHaveTextContent('?tab=foods&category=fat');
  });
});
