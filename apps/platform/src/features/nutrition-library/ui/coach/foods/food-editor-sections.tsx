import { describedByOf, toggled } from "~/shared/design-system/lib";
import {
  SettingsBody,
  SettingsRow,
  SettingsRows,
  SettingsSection,
} from "~/shared/design-system/portal";
import {
  CheckboxChip,
  IconChoiceGrid,
  InlineProblem,
  Input,
  Legend,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/shared/design-system/primitives";
import { Flame, Tags, Utensils } from "lucide-react";
import { useId } from "react";
import type { PathValue, UseFormReturn } from "react-hook-form";

import type { NutritionTagView } from "~/features/nutrition-library/public/foods";
import { FOOD_ICON_APPEARANCE } from "~/features/nutrition-library/ui/shared/food-icons";
import {
  TAG_FAMILY_APPEARANCE,
  TAG_FAMILY_LABELS,
} from "~/features/nutrition-library/ui/shared/tag-pill";

import {
  CATEGORY_LABELS,
  FOOD_CATEGORIES,
  FOOD_ICONS,
  TAG_FAMILIES,
  type FoodFieldProblems,
  type FoodFormValues,
  type FoodProblemField,
} from "./food-form";

type FoodForm = UseFormReturn<FoodFormValues>;

const FOOD_ICON_CHOICES = FOOD_ICONS.map((key) => ({
  key,
  label: FOOD_ICON_APPEARANCE[key].label,
  icon: FOOD_ICON_APPEARANCE[key].glyph,
}));

const AMOUNT_PRECISIONS = {
  hundredths: { inputMode: "decimal", step: "0.01" },
  "whole-grams": { inputMode: "numeric", step: "1" },
} as const;

type AmountField = {
  field: Exclude<FoodProblemField, "name">;
  title: string;
  precision: keyof typeof AMOUNT_PRECISIONS;
  description?: string;
};

const AMOUNT_FIELDS: readonly AmountField[] = [
  { field: "kcal", title: "Calories", precision: "hundredths" },
  { field: "protein", title: "Protein (g)", precision: "hundredths" },
  { field: "carb", title: "Carbs (g)", precision: "hundredths" },
  { field: "fat", title: "Fat (g)", precision: "hundredths" },
  {
    field: "defaultPortionGrams",
    title: "Default portion (g)",
    precision: "whole-grams",
    description: "Proposed when the food enters a recipe.",
  },
];

function changeValue<Field extends "category" | "icon" | "tagIds">(
  form: FoodForm,
  field: Field,
  value: PathValue<FoodFormValues, Field>,
) {
  form.setValue(field, value, { shouldDirty: true });
}

function shownProblem(id: string, problem: string | undefined) {
  return problem && <InlineProblem id={id}>{problem}</InlineProblem>;
}

export function FoodAboutSection({
  form,
  values,
  problems,
}: {
  form: FoodForm;
  values: FoodFormValues;
  problems: FoodFieldProblems;
}) {
  const nameId = useId();
  const nameProblemId = useId();
  const categoryId = useId();
  const iconLabelId = useId();

  return (
    <SettingsSection
      headingId="food-about-heading"
      icon={Utensils}
      title="About the food"
    >
      <SettingsRows>
        <SettingsRow
          htmlFor={nameId}
          layout="stacked"
          problem={shownProblem(nameProblemId, problems.name)}
          required
          title="Name"
        >
          <Input
            aria-describedby={describedByOf(
              problems.name ? nameProblemId : undefined,
            )}
            aria-invalid={problems.name ? true : undefined}
            defaultValue={form.formState.defaultValues?.name}
            id={nameId}
            placeholder="e.g. Chicken breast"
            {...form.register("name")}
          />
        </SettingsRow>
        <SettingsRow htmlFor={categoryId} layout="stacked" title="Category">
          <Select
            onValueChange={(chosen) => {
              const category = FOOD_CATEGORIES.find(
                (known) => known === chosen,
              );
              if (category) changeValue(form, "category", category);
            }}
            value={values.category}
          >
            <SelectTrigger id={categoryId}>
              <SelectValue>{CATEGORY_LABELS[values.category]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FOOD_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          as="fieldset"
          labelId={iconLabelId}
          layout="stacked"
          title="Icon"
        >
          <IconChoiceGrid
            aria-labelledby={iconLabelId}
            data-parity="food-icon-grid"
            onChange={(icon) => changeValue(form, "icon", icon)}
            options={FOOD_ICON_CHOICES}
            value={values.icon}
          />
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}

export function FoodNutritionSection({
  form,
  problems,
}: {
  form: FoodForm;
  problems: FoodFieldProblems;
}) {
  return (
    <SettingsSection
      headingId="food-nutrition-heading"
      icon={Flame}
      title="Nutrition per 100 g"
    >
      <SettingsRows>
        {AMOUNT_FIELDS.map((amount) => (
          <AmountRow
            amount={amount}
            form={form}
            key={amount.field}
            problem={problems[amount.field]}
          />
        ))}
      </SettingsRows>
    </SettingsSection>
  );
}

function AmountRow({
  form,
  amount: { field, title, precision, description },
  problem,
}: {
  form: FoodForm;
  amount: AmountField;
  problem: string | undefined;
}) {
  const inputId = useId();
  const descriptionId = useId();
  const problemId = useId();
  const { inputMode, step } = AMOUNT_PRECISIONS[precision];

  return (
    <SettingsRow
      description={description}
      descriptionId={descriptionId}
      htmlFor={inputId}
      problem={shownProblem(problemId, problem)}
      title={title}
    >
      <Input
        aria-describedby={describedByOf(
          description ? descriptionId : undefined,
          problem ? problemId : undefined,
        )}
        aria-invalid={problem ? true : undefined}
        className="sm:w-40"
        defaultValue={form.formState.defaultValues?.[field]}
        id={inputId}
        inputMode={inputMode}
        min="0"
        step={step}
        type="number"
        {...form.register(field)}
      />
    </SettingsRow>
  );
}

export function FoodTagsSection({
  form,
  values,
  tags,
}: {
  form: FoodForm;
  values: FoodFormValues;
  tags: readonly NutritionTagView[];
}) {
  return (
    <SettingsSection headingId="food-tags-heading" icon={Tags} title="Tags">
      <SettingsBody
        className="grid gap-6 sm:grid-cols-2"
        data-parity="food-tag-chips"
      >
        {TAG_FAMILIES.map((family) => {
          const { icon: FamilyIcon } = TAG_FAMILY_APPEARANCE[family];

          return (
            <fieldset key={family}>
              <Legend layout="inline">
                <FamilyIcon
                  aria-hidden="true"
                  className="text-text-secondary"
                  size={14}
                />
                {TAG_FAMILY_LABELS[family]}
              </Legend>
              <ul className="mt-2 flex flex-wrap gap-2">
                {tags
                  .filter((tag) => tag.family === family)
                  .map((tag) => (
                    <li key={tag.id}>
                      <CheckboxChip
                        aria-label={tag.label}
                        isChecked={values.tagIds.includes(tag.id)}
                        onChange={() =>
                          changeValue(
                            form,
                            "tagIds",
                            toggled(values.tagIds, tag.id),
                          )
                        }
                        size="compact"
                      >
                        {tag.label}
                      </CheckboxChip>
                    </li>
                  ))}
              </ul>
            </fieldset>
          );
        })}
      </SettingsBody>
    </SettingsSection>
  );
}
