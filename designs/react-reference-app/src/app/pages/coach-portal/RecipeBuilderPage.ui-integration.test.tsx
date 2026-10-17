import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecipeBuilderPage } from './RecipeBuilderPage';
import { AppProvider } from '../../context/AppContext';
import { NutritionProvider, useNutrition } from '../../context/NutritionContext';

type User = ReturnType<typeof userEvent.setup>;

const NEW = '/coach/nutrition/recipe-builder';
const CHICKEN_BOWL = '/coach/nutrition/recipe-builder/recipe-chicken-rice-bowl';
const RICE_CAKE_STACK = '/coach/nutrition/recipe-builder/recipe-rice-cake-stack';

function viewportIsDesktop(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  viewportIsDesktop(false);
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});

function SavedRecipeProbe({ name }: { name: string }) {
  const { recipes } = useNutrition();
  const saved = recipes.find((recipe) => recipe.name === name);
  return (
    <p data-testid="saved">
      {saved
        ? [
            saved.ingredients.map((ingredient) => `${ingredient.foodId}:${ingredient.grams}:${ingredient.method}`).join('+'),
            saved.prepMinutes,
            saved.cookMinutes,
            saved.instructions,
          ].join('|')
        : 'none'}
    </p>
  );
}

function LibraryStandIn() {
  const { search } = useLocation();
  return <p data-testid="library-search">{search}</p>;
}

function renderBuilder(entry = NEW, probeName = 'Morning oats'): User {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AppProvider>
        <NutritionProvider>
          <SavedRecipeProbe name={probeName} />
          <Routes>
            <Route path="/coach/nutrition" element={<LibraryStandIn />} />
            <Route path="/coach/nutrition/recipe-builder" element={<RecipeBuilderPage />} />
            <Route path="/coach/nutrition/recipe-builder/:recipeId" element={<RecipeBuilderPage />} />
          </Routes>
          <Toaster />
        </NutritionProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const nameField = () => screen.getByRole('textbox', { name: 'Recipe name' });
const gramsField = (food: string) => screen.getByRole('spinbutton', { name: `Grams of ${food}` });
const minutesField = (name: 'Prep (min)' | 'Cook (min)') => screen.getByRole('spinbutton', { name });
const instructionsField = () => screen.getByRole('textbox', { name: 'Instructions' });
const saveButton = () => screen.getByRole('button', { name: 'Save recipe' });

async function retype(user: User, field: HTMLElement, value: string) {
  await user.clear(field);
  if (value !== '') await user.type(field, value);
}

const breakfastChip = () =>
  within(screen.getByRole('group', { name: 'Meal-time' })).getByRole('checkbox', { name: 'Breakfast' });

describe('the recipe builder in MVP mode', () => {
  it('adds an ingredient without adding its tags', async () => {
    // arrange
    const user = renderBuilder();

    // act
    await user.click(screen.getByRole('button', { name: 'Add Oats to recipe' }));

    // assert
    expect(breakfastChip()).not.toBeChecked();
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
    expect(breakfastChip()).toBeChecked();
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

describe("the recipe builder's problems", () => {
  it('stay hidden until the coach changes something', async () => {
    // arrange
    const user = renderBuilder();
    expect(screen.queryByText('Give the recipe a name')).not.toBeInTheDocument();
    expect(nameField()).not.toHaveAttribute('aria-invalid');

    // act
    await retype(user, minutesField('Prep (min)'), '10');

    // assert
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(nameField()).toHaveAccessibleDescription('Give the recipe a name');
    expect(saveButton()).toBeDisabled();
  });

  it('refuse a name another active recipe holds whatever the case', async () => {
    // arrange
    const user = renderBuilder();

    // act
    await user.type(nameField(), 'chicken RICE bowl');

    // assert
    expect(nameField()).toHaveAccessibleDescription('A recipe with this name already exists');
    expect(saveButton()).toBeDisabled();
  });

  it('refuse 0 grams under that ingredient and disable Save until the grams fit', async () => {
    // arrange
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');
    await user.click(screen.getByRole('button', { name: 'Add Oats to recipe' }));
    expect(gramsField('Oats')).toHaveAttribute('min', '1');

    // act
    await retype(user, gramsField('Oats'), '0');

    // assert
    expect(gramsField('Oats')).toHaveAttribute('aria-invalid', 'true');
    expect(gramsField('Oats')).toHaveAccessibleDescription('Enter whole grams from 1 to 99,999');
    expect(saveButton()).toBeDisabled();

    // act
    await retype(user, gramsField('Oats'), '60');

    // assert
    expect(gramsField('Oats')).not.toHaveAttribute('aria-invalid');
    expect(saveButton()).toBeEnabled();
  });

  it('refuse minutes over 9,999 under Prep and Cook', async () => {
    // arrange
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');

    // act
    await retype(user, minutesField('Prep (min)'), '10000');
    await retype(user, minutesField('Cook (min)'), '2.5');

    // assert
    expect(minutesField('Prep (min)')).toHaveAccessibleDescription('Enter whole minutes up to 9,999');
    expect(minutesField('Cook (min)')).toHaveAccessibleDescription('Enter whole minutes up to 9,999');
    expect(saveButton()).toBeDisabled();
  });

  it('refuse instructions over 2,000 characters', async () => {
    // arrange
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');

    // act
    await user.click(instructionsField());
    await user.paste('a'.repeat(2_001));

    // assert
    expect(instructionsField()).toHaveAccessibleDescription('Keep the instructions to 2,000 characters');
    expect(saveButton()).toBeDisabled();
  });
});

describe('saving a recipe', () => {
  it('creates it with its grams and minutes, says so and returns to the recipes', async () => {
    // arrange
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');
    await user.click(screen.getByRole('button', { name: 'Add Oats to recipe' }));
    await retype(user, gramsField('Oats'), '60');
    await retype(user, minutesField('Prep (min)'), '');
    await retype(user, minutesField('Cook (min)'), '5');
    await user.type(instructionsField(), '  Soak overnight. ');

    // act
    await user.click(saveButton());

    // assert
    expect(await screen.findByText('Recipe created')).toBeInTheDocument();
    expect(screen.getByTestId('library-search')).toHaveTextContent('?tab=recipes');
    expect(screen.getByTestId('saved')).toHaveTextContent('food-oats:60:raw|0|5|Soak overnight.');
  });

  it('allows a recipe with no ingredients', async () => {
    // arrange
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');

    // act
    await user.click(saveButton());

    // assert
    expect(await screen.findByText('Recipe created')).toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent(/^\|0\|0\|$/);
  });

  it('updates an existing recipe and says so', async () => {
    // arrange
    const user = renderBuilder(CHICKEN_BOWL, 'Chicken rice bowl');
    await retype(user, gramsField('Chicken breast'), '200');

    // act
    await user.click(saveButton());

    // assert
    expect(await screen.findByText('Recipe updated')).toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent(
      'food-chicken:200:grilled+food-white-rice:150:boiled+food-olive-oil:10:pan-fried|10|20|',
    );
  });
});

describe("an archived food already in a recipe", () => {
  it('stays listed and editable among the ingredients without being offered in the library', async () => {
    // arrange
    const user = renderBuilder(RICE_CAKE_STACK, 'Rice cake & yogurt stack');
    expect(gramsField('Rice cakes')).toHaveValue(20);

    // act
    await retype(user, gramsField('Rice cakes'), '30');

    // assert
    expect(gramsField('Rice cakes')).toHaveValue(30);
    expect(screen.queryByRole('button', { name: 'Add Rice cakes to recipe' })).not.toBeInTheDocument();
  });
});

describe('a recipe save the server refuses', () => {
  it('says it could not save, stays on the builder and keeps her entries', async () => {
    // arrange
    window.history.replaceState(null, '', '/?rsave=fail');
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');
    await user.click(screen.getByRole('button', { name: 'Add Oats to recipe' }));
    await retype(user, gramsField('Oats'), '60');

    // act
    await user.click(saveButton());

    // assert
    expect(
      await screen.findByText("We couldn't save the recipe. Try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('library-search')).not.toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent('none');
    expect(nameField()).toHaveValue('Morning oats');
    expect(gramsField('Oats')).toHaveValue(60);
  });
});

describe('leaving the builder', () => {
  it('links back to the recipes from the back arrow and Cancel', () => {
    // arrange
    // act
    renderBuilder();

    // assert
    expect(screen.getByRole('link', { name: 'Back to Nutrition' })).toHaveAttribute(
      'href',
      '/coach/nutrition?tab=recipes',
    );
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/coach/nutrition?tab=recipes',
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Recipe builder' })).toBeInTheDocument();
  });
});

describe('the builder outside the portal shell', () => {
  it('takes the coach portal styling while it is open', () => {
    // arrange
    // act
    renderBuilder();

    // assert
    expect(document.documentElement.dataset.portal).toBe('coach');
  });
});

describe('the food library drawer on a phone', () => {
  const library = () => screen.getByRole('complementary', { name: 'Food library' });
  const libraryControls = () => within(library()).getAllByRole('button');

  async function openLibrary(user: User) {
    await user.click(screen.getByRole('button', { name: 'Open food library' }));
  }

  it('closes on Escape and returns focus to Open food library', async () => {
    // arrange
    const user = renderBuilder();
    await openLibrary(user);

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(screen.getByRole('button', { name: 'Open food library' })).toHaveFocus();
    await user.tab();
    expect(nameField()).toHaveFocus();
  });

  it('wraps Tab from its last control to its first', async () => {
    // arrange
    const user = renderBuilder();
    await openLibrary(user);
    libraryControls().at(-1)?.focus();

    // act
    await user.tab();

    // assert
    expect(screen.getByRole('button', { name: 'Close food library' })).toHaveFocus();
  });

  it('wraps Shift+Tab from its first control to its last', async () => {
    // arrange
    const user = renderBuilder();
    await openLibrary(user);

    // act
    await user.tab({ shift: true });

    // assert
    expect(libraryControls().at(-1)).toHaveFocus();
  });

  it('leaves Tab and Escape alone on a wide screen, where the library sits beside the recipe', async () => {
    // arrange
    viewportIsDesktop(true);
    const user = renderBuilder();
    await openLibrary(user);

    // act
    await user.keyboard('{Escape}');
    await user.tab({ shift: true });

    // assert
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveFocus();
  });
});
