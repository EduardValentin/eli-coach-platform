import { toggled } from "@eli-coach-platform/ui/lib";
import {
  SettingsRow,
  SettingsRows,
  SettingsSection,
} from "@eli-coach-platform/ui/portal";
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
} from "@eli-coach-platform/ui/primitives";
import { Flame, Tags, Utensils } from "lucide-react";
import { useId } from "react";
import type { PathValue, UseFormReturn } from "react-hook-form";

import type { NutritionTagView } from "~/features/nutrition-library/public/foods";
import { FOOD_ICON_GLYPHS } from "~/features/nutrition-library/ui/shared/food-icons";
import { TAG_FAMILY_APPEARANCE } from "~/features/nutrition-library/ui/shared/tag-pill";

import {
  CATEGORY_LABELS,
  FOOD_CATEGORIES,
  FOOD_ICON_LABELS,
  FOOD_ICONS,
  TAG_FAMILIES,
  TAG_FAMILY_LABELS,
  type FoodFieldProblems,
  type FoodFormValues,
} from "./food-form";

type FoodForm = UseFormReturn<FoodFormValues>;

const FOOD_ICON_CHOICES = FOOD_ICONS.map((key) => ({
  key,
  label: FOOD_ICON_LABELS[key],
  icon: FOOD_ICON_GLYPHS[key],
}));

const AMOUNT_FIELDS = [
  { field: "kcal", title: "Calories" },
  { field: "protein", title: "Protein (g)" },
  { field: "carb", title: "Carbs (g)" },
  { field: "fat", title: "Fat (g)" },
] as const;

function changeValue<Field extends "category" | "icon" | "tagIds">(
  form: FoodForm,
  field: Field,
  value: PathValue<FoodFormValues, Field>,
) {
  form.setValue(field, value, { shouldDirty: true });
}

function describedBy(...ids: (string | false | undefined)[]) {
  return ids.filter(Boolean).join(" ") || undefined;
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
            aria-describedby={describedBy(problems.name && nameProblemId)}
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
        {AMOUNT_FIELDS.map(({ field, title }) => (
          <AmountRow
            field={field}
            form={form}
            key={field}
            problem={problems[field]}
            title={title}
          />
        ))}
        <AmountRow
          description="Proposed when the food enters a recipe."
          field="defaultPortionGrams"
          form={form}
          problem={problems.defaultPortionGrams}
          title="Default portion (g)"
        />
      </SettingsRows>
    </SettingsSection>
  );
}

function AmountRow({
  form,
  field,
  title,
  description,
  problem,
}: {
  form: FoodForm;
  field: "kcal" | "protein" | "carb" | "fat" | "defaultPortionGrams";
  title: string;
  description?: string;
  problem: string | undefined;
}) {
  const inputId = useId();
  const descriptionId = useId();
  const problemId = useId();
  const wholeGrams = field === "defaultPortionGrams";

  return (
    <SettingsRow
      description={description}
      descriptionId={descriptionId}
      htmlFor={inputId}
      problem={shownProblem(problemId, problem)}
      title={title}
    >
      <Input
        aria-describedby={describedBy(
          description && descriptionId,
          problem && problemId,
        )}
        aria-invalid={problem ? true : undefined}
        className="sm:w-40"
        defaultValue={form.formState.defaultValues?.[field]}
        id={inputId}
        inputMode={wholeGrams ? "numeric" : "decimal"}
        min="0"
        step={wholeGrams ? "1" : "0.01"}
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
      <div
        className="grid gap-6 px-5 py-5 sm:grid-cols-2 sm:px-6"
        data-parity="food-tag-chips"
      >
        {TAG_FAMILIES.map((family) => {
          const { icon: FamilyIcon } = TAG_FAMILY_APPEARANCE[family];

          return (
            <fieldset key={family}>
              <Legend className="items-center">
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
      </div>
    </SettingsSection>
  );
}
