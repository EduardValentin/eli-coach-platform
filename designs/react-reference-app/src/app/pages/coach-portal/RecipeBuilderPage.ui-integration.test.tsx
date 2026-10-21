import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecipeBuilderPage } from './RecipeBuilderPage';
import { AppProvider } from '../../context/AppContext';
import { NutritionProvider, useNutrition } from '../../context/NutritionContext';
import type { RecipePhotoUpload } from '../../services/recipePhotoService';

type User = ReturnType<typeof userEvent.setup>;

const NEW = '/coach/nutrition/recipe-builder';
const CHICKEN_BOWL = '/coach/nutrition/recipe-builder/recipe-chicken-rice-bowl';
const RICE_CAKE_STACK = '/coach/nutrition/recipe-builder/recipe-rice-cake-stack';
const SERVICE_TIMEOUT = { timeout: 4000 };
const UPLOAD_FAILED = 'The upload didn’t go through. Your entries are still here.';
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

function arrangePhoneViewport() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function arrangeDesktopViewport() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeAll(() => {
  URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`);
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  arrangePhoneViewport();
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

function SavedPhotoProbe({ name }: { name: string }) {
  const { recipes } = useNutrition();
  const saved = recipes.find((recipe) => recipe.name === name);
  return <p data-testid="saved-photo">{saved ? (saved.imageUrl ?? 'no photo') : 'none'}</p>;
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
          <SavedPhotoProbe name={probeName} />
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

const photoInput = () => screen.getByLabelText('Recipe photo file input');
const photoNamed = (name: string, type: string) => new File(['photo'], name, { type });
const uploadButton = () => screen.getByRole('button', { name: 'Upload recipe photo' });
const replaceButton = () => screen.getByRole('button', { name: 'Replace recipe photo' });
const removeButton = () => screen.getByRole('button', { name: 'Remove recipe photo' });
const photoAlert = (text: string) =>
  screen.getAllByRole('alert').find((candidate) => candidate.textContent?.includes(text));

function answerPhotoUploads(outcome: RecipePhotoUpload) {
  window.history.replaceState(null, '', `/?rphoto=${outcome}`);
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
    arrangeDesktopViewport();
    const user = renderBuilder();
    await openLibrary(user);

    // act
    await user.keyboard('{Escape}');
    await user.tab({ shift: true });

    // assert
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveFocus();
  });
});

describe('choosing a recipe photo', () => {
  it('previews the chosen photo at once with Replace and Remove over it', async () => {
    // arrange
    const user = renderBuilder();

    // act
    await user.upload(photoInput(), photoNamed('bowl.jpg', 'image/jpeg'));

    // assert
    expect(screen.getByRole('img', { name: 'Recipe' })).toHaveAttribute('src', 'blob:bowl.jpg');
    expect(replaceButton()).toBeEnabled();
    expect(removeButton()).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Upload recipe photo' })).not.toBeInTheDocument();
  });

  it('moves focus from Upload photo to Replace once a first photo is chosen', async () => {
    // arrange
    const user = renderBuilder();
    uploadButton().focus();
    await user.keyboard('{Enter}');

    // act
    fireEvent.change(photoInput(), { target: { files: [photoNamed('bowl.jpg', 'image/jpeg')] } });

    // assert
    expect(replaceButton()).toHaveFocus();
  });

  it('offers only the photo formats it accepts', () => {
    // arrange
    // act
    renderBuilder();

    // assert
    expect(photoInput()).toHaveAttribute('accept', '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp');
  });

  it('returns focus to Upload photo once the photo is removed', async () => {
    // arrange
    const user = renderBuilder(CHICKEN_BOWL, 'Chicken rice bowl');

    // act
    await user.click(removeButton());

    // assert
    expect(uploadButton()).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Replace recipe photo' })).not.toBeInTheDocument();
  });

  it('refuses a file that is not a JPEG, PNG or WebP photo, naming it, and keeps the visual as it was', () => {
    // arrange
    renderBuilder();

    // act
    fireEvent.change(photoInput(), { target: { files: [photoNamed('bowl.gif', 'image/gif')] } });

    // assert
    const message = 'bowl.gif is not a .jpg, .png or .webp — only JPEG, PNG and WebP photos are supported';
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(uploadButton()).toHaveAttribute('aria-invalid', 'true');
    expect(uploadButton()).toHaveAccessibleDescription(message);
    expect(screen.queryByRole('button', { name: 'Replace recipe photo' })).not.toBeInTheDocument();
  });

  it('refuses a photo over 10 MB and keeps the current photo', () => {
    // arrange
    renderBuilder(CHICKEN_BOWL, 'Chicken rice bowl');
    const oversize = photoNamed('bowl.jpg', 'image/jpeg');
    Object.defineProperty(oversize, 'size', { value: PHOTO_MAX_BYTES + 1 });

    // act
    fireEvent.change(photoInput(), { target: { files: [oversize] } });

    // assert
    expect(screen.getByRole('alert')).toHaveTextContent('bowl.jpg is larger than 10 MB');
    expect(replaceButton()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('img', { name: 'Chicken rice bowl' })).toHaveAttribute(
      'src',
      expect.stringMatching(/chicken-rice-bowl\.jpg$/),
    );
  });

  it('clears the refusal once an accepted photo is chosen', async () => {
    // arrange
    const user = renderBuilder();
    const oversize = photoNamed('large.jpg', 'image/jpeg');
    Object.defineProperty(oversize, 'size', { value: PHOTO_MAX_BYTES + 1 });
    await user.upload(photoInput(), oversize);
    expect(screen.getByRole('alert')).toHaveTextContent('large.jpg is larger than 10 MB');

    // act
    await user.upload(photoInput(), photoNamed('bowl.png', 'image/png'));

    // assert
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(replaceButton()).not.toHaveAttribute('aria-invalid');
  });

  it('falls back to the icon when the photo does not load, and previews a newly chosen one', async () => {
    // arrange
    const user = renderBuilder(CHICKEN_BOWL, 'Chicken rice bowl');
    fireEvent.error(screen.getByRole('img', { name: 'Chicken rice bowl' }));
    expect(screen.getByRole('img', { name: 'Chicken rice bowl' })).not.toHaveAttribute('src');

    // act
    await user.upload(photoInput(), photoNamed('bowl.jpg', 'image/jpeg'));

    // assert
    expect(screen.getByRole('img', { name: 'Chicken rice bowl' })).toHaveAttribute('src', 'blob:bowl.jpg');
  });
});

describe('saving with a newly chosen photo', () => {
  it('saves the recipe with the uploaded photo', async () => {
    // arrange
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');
    await user.upload(photoInput(), photoNamed('bowl.jpg', 'image/jpeg'));

    // act
    await user.click(saveButton());

    // assert
    expect(await screen.findByText('Recipe created', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByTestId('saved-photo')).toHaveTextContent('blob:bowl.jpg');
  });

  it('turns Save into a busy Saving… and locks Replace and Remove while the photo uploads', async () => {
    // arrange
    answerPhotoUploads('holds');
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');
    await user.upload(photoInput(), photoNamed('bowl.jpg', 'image/jpeg'));

    // act
    await user.click(saveButton());

    // assert
    const saving = screen.getByRole('button', { name: 'Saving…' });
    expect(saving).toBeDisabled();
    expect(saving).toHaveAttribute('aria-busy', 'true');
    expect(replaceButton()).toBeDisabled();
    expect(removeButton()).toBeDisabled();
    expect(screen.getByTestId('saved')).toHaveTextContent('none');
  });

  it('keeps every entry and the chosen photo when the upload fails, and offers Try again', async () => {
    // arrange
    answerPhotoUploads('fails');
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');
    await user.upload(photoInput(), photoNamed('bowl.jpg', 'image/jpeg'));

    // act
    await user.click(saveButton());

    // assert
    await screen.findByText(UPLOAD_FAILED, {}, SERVICE_TIMEOUT);
    const alert = photoAlert(UPLOAD_FAILED);
    expect(alert).toBeDefined();
    expect(within(alert as HTMLElement).getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(nameField()).toHaveValue('Morning oats');
    expect(screen.getByRole('img', { name: 'Morning oats' })).toHaveAttribute('src', 'blob:bowl.jpg');
    expect(saveButton()).toBeEnabled();
    expect(screen.getByTestId('saved')).toHaveTextContent('none');
  });

  it('saves again from Try again, keeping the entries', async () => {
    // arrange
    answerPhotoUploads('fails');
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');
    await user.upload(photoInput(), photoNamed('bowl.jpg', 'image/jpeg'));
    await user.click(saveButton());
    await screen.findByText(UPLOAD_FAILED, {}, SERVICE_TIMEOUT);

    // act
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // assert
    expect(screen.queryByText(UPLOAD_FAILED)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(await screen.findByText(UPLOAD_FAILED, {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(nameField()).toHaveValue('Morning oats');
  });

  it('shows the server refusing the file at the photo, keeping the photo and every entry', async () => {
    // arrange
    answerPhotoUploads('refused');
    const user = renderBuilder();
    await user.type(nameField(), 'Morning oats');
    await user.upload(photoInput(), photoNamed('bowl.jpg', 'image/jpeg'));

    // act
    await user.click(saveButton());

    // assert
    const message = 'bowl.jpg doesn’t contain a JPEG, PNG or WebP photo.';
    expect(await screen.findByText(message, {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(replaceButton()).toHaveAttribute('aria-invalid', 'true');
    expect(replaceButton()).toHaveAccessibleDescription(message);
    expect(replaceButton()).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Morning oats' })).toHaveAttribute('src', 'blob:bowl.jpg');
    expect(saveButton()).toBeEnabled();
    expect(screen.getByTestId('saved')).toHaveTextContent('none');
  });

  it('stays a plain save when no new photo was chosen', async () => {
    // arrange
    answerPhotoUploads('holds');
    const user = renderBuilder(CHICKEN_BOWL, 'Chicken rice bowl');
    await retype(user, gramsField('Chicken breast'), '200');

    // act
    await user.click(saveButton());

    // assert
    expect(await screen.findByText('Recipe updated')).toBeInTheDocument();
    expect(screen.getByTestId('saved-photo')).toHaveTextContent(/chicken-rice-bowl\.jpg$/);
  });
});

describe('replacing or removing a recipe photo', () => {
  it('saves the recipe without a photo once it is removed', async () => {
    // arrange
    const user = renderBuilder(CHICKEN_BOWL, 'Chicken rice bowl');
    await user.click(removeButton());

    // act
    await user.click(saveButton());

    // assert
    expect(await screen.findByText('Recipe updated')).toBeInTheDocument();
    expect(screen.getByTestId('saved-photo')).toHaveTextContent('no photo');
  });

  it('keeps only the new photo once it is replaced', async () => {
    // arrange
    const user = renderBuilder(CHICKEN_BOWL, 'Chicken rice bowl');
    await user.upload(photoInput(), photoNamed('bowl.webp', 'image/webp'));

    // act
    await user.click(saveButton());

    // assert
    expect(await screen.findByText('Recipe updated', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByTestId('saved-photo')).toHaveTextContent('blob:bowl.webp');
  });
});
