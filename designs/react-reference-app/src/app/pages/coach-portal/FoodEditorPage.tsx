import { useId, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { Check, Flame, Tags, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { FOOD_CATEGORIES, TAG_FAMILIES, useNutrition, type Food, type FoodCategory } from '../../context/NutritionContext';
import {
  DEFAULT_PORTION_GRAMS,
  draftProblems,
  foodFrom,
  isValidDraft,
  type FoodDraft,
  type FoodDraftProblems,
} from '../../domain/foods';
import { libraryReturnPath, toggled } from '../../utils/libraryListing';
import { FOOD_ICONS, TAG_FAMILY_ICON } from '../../components/coach-portal/nutrition/food-icons';
import { CATEGORY_LABELS, TAG_FAMILY_LABELS } from '../../components/coach-portal/nutrition/nutrition-constants';
import { CheckboxChip } from '../../components/CheckboxChip';
import { IconChoiceGrid } from '../../components/IconChoiceGrid';
import { InlineProblem } from '../../components/InlineProblem';
import { PortalBackLink } from '../../components/PortalBackLink';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SettingsRow, SettingsRows, SettingsSection } from '../../components/SettingsSection';
import { Button, buttonVariants } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Legend } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

const LIBRARY = '/coach/nutrition';

const NEW_FOOD: FoodDraft = {
  name: '',
  category: 'protein',
  icon: 'other',
  kcal: '',
  protein: '',
  carb: '',
  fat: '',
  defaultPortionGrams: String(DEFAULT_PORTION_GRAMS),
  tagIds: [],
};

const MACRO_FIELDS = [
  { key: 'kcal', title: 'Calories' },
  { key: 'protein', title: 'Protein (g)' },
  { key: 'carb', title: 'Carbs (g)' },
  { key: 'fat', title: 'Fat (g)' },
] as const;

function draftOf(food: Food): FoodDraft {
  return {
    name: food.name,
    category: food.category,
    icon: food.icon ?? 'other',
    kcal: String(food.kcal),
    protein: String(food.protein),
    carb: String(food.carb),
    fat: String(food.fat),
    defaultPortionGrams: String(food.defaultPortionGrams),
    tagIds: food.tagIds,
  };
}

function NumberRow({
  title,
  description,
  inputMode,
  value,
  problem,
  onChange,
}: {
  title: string;
  description?: string;
  inputMode: 'decimal' | 'numeric';
  value: string;
  problem: string | undefined;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const descriptionId = useId();
  const problemId = useId();
  const describedBy = [description && descriptionId, problem && problemId].filter(Boolean).join(' ');
  return (
    <SettingsRow
      htmlFor={inputId}
      title={title}
      description={description}
      descriptionId={descriptionId}
      problem={problem && <InlineProblem id={problemId}>{problem}</InlineProblem>}
    >
      <Input
        id={inputId}
        type="number"
        inputMode={inputMode}
        min="0"
        step={inputMode === 'decimal' ? '0.01' : '1'}
        className="sm:w-40"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={problem ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
    </SettingsRow>
  );
}

function FoodEditor({ editing, library }: { editing: Food | undefined; library: string }) {
  const navigate = useNavigate();
  const { foods, tags, addFood, updateFood } = useNutrition();
  const [draft, setDraft] = useState<FoodDraft>(editing ? draftOf(editing) : NEW_FOOD);
  const [touched, setTouched] = useState(false);
  const ids = { name: useId(), nameProblem: useId(), category: useId(), iconLabel: useId() };

  const others = foods.filter((food) => food.id !== editing?.id);
  const problems = draftProblems(draft, others);
  const shownProblems: FoodDraftProblems = touched ? problems : {};
  const set = <Key extends keyof FoodDraft>(key: Key, value: FoodDraft[Key]) => {
    setTouched(true);
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  const save = () => {
    const fields = foodFrom(draft);
    if (editing) {
      updateFood(editing.id, fields);
      toast.success('Food updated');
    } else {
      addFood(fields);
      toast.success('Food created');
    }
    navigate(library);
  };

  return (
    <div className="w-full max-w-3xl" data-parity-root="FoodEditorPage">
      <PortalBackLink to={library}>Back to foods</PortalBackLink>
      <PortalPageHeader title={editing ? 'Edit food' : 'New food'} />

      <div className="space-y-6 sm:space-y-8">
        <SettingsSection headingId="food-about-heading" title="About the food" icon={Utensils}>
          <SettingsRows>
            <SettingsRow
              htmlFor={ids.name}
              title="Name"
              required
              layout="stacked"
              problem={shownProblems.name && <InlineProblem id={ids.nameProblem}>{shownProblems.name}</InlineProblem>}
            >
              <Input
                id={ids.name}
                value={draft.name}
                onChange={(event) => set('name', event.target.value)}
                placeholder="e.g. Chicken breast"
                aria-invalid={shownProblems.name ? true : undefined}
                aria-describedby={shownProblems.name ? ids.nameProblem : undefined}
              />
            </SettingsRow>
            <SettingsRow htmlFor={ids.category} title="Category" layout="stacked">
              <Select value={draft.category} onValueChange={(value) => set('category', value as FoodCategory)}>
                <SelectTrigger id={ids.category}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOOD_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>{CATEGORY_LABELS[category]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
            <SettingsRow as="fieldset" labelId={ids.iconLabel} title="Icon" layout="stacked">
              <IconChoiceGrid
                options={FOOD_ICONS}
                value={draft.icon}
                onChange={(icon) => set('icon', icon)}
                data-parity="food-icon-grid"
              />
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>

        <SettingsSection headingId="food-nutrition-heading" title="Nutrition per 100 g" icon={Flame}>
          <SettingsRows>
            {MACRO_FIELDS.map(({ key, title }) => (
              <NumberRow
                key={key}
                title={title}
                inputMode="decimal"
                value={draft[key]}
                problem={shownProblems[key]}
                onChange={(value) => set(key, value)}
              />
            ))}
            <NumberRow
              title="Default portion (g)"
              description="Proposed when the food enters a recipe."
              inputMode="numeric"
              value={draft.defaultPortionGrams}
              problem={shownProblems.defaultPortionGrams}
              onChange={(value) => set('defaultPortionGrams', value)}
            />
          </SettingsRows>
        </SettingsSection>

        <SettingsSection headingId="food-tags-heading" title="Tags" icon={Tags}>
          <div className="grid gap-6 px-5 py-5 sm:grid-cols-2 sm:px-6" data-parity="food-tag-chips">
            {TAG_FAMILIES.map((family) => {
              const FamilyIcon = TAG_FAMILY_ICON[family];
              return (
                <fieldset key={family}>
                  <Legend className="items-center">
                    <FamilyIcon size={14} className="text-text-secondary" aria-hidden="true" />
                    {TAG_FAMILY_LABELS[family]}
                  </Legend>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {tags
                      .filter((tag) => tag.family === family)
                      .map((tag) => (
                        <li key={tag.id}>
                          <CheckboxChip
                            size="compact"
                            aria-label={tag.label}
                            checked={draft.tagIds.includes(tag.id)}
                            onCheckedChange={() => set('tagIds', toggled(draft.tagIds, tag.id))}
                          >
                            {tag.label}
                          </CheckboxChip>
                        </li>
                      ))}
                  </ul>
                </fieldset>
              );
            })}
          </div>
        </SettingsSection>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3" data-parity="food-editor-actions">
        <Link to={library} className={buttonVariants({ variant: 'ghost', size: 'md' })}>
          Cancel
        </Link>
        <Button onClick={save} variant="primary" size="md" disabled={!isValidDraft(problems)}>
          <Check size={16} />
          {editing ? 'Save changes' : 'Create food'}
        </Button>
      </div>
    </div>
  );
}

export function FoodEditorPage() {
  const { foodId } = useParams<{ foodId?: string }>();
  const { foods } = useNutrition();
  const library = libraryReturnPath(LIBRARY, useLocation().state);
  const editing = foodId ? foods.find((food) => food.id === foodId) : undefined;
  if (foodId && !editing) return <Navigate to={library} replace />;
  return <FoodEditor key={editing?.id ?? 'new'} editing={editing} library={library} />;
}
