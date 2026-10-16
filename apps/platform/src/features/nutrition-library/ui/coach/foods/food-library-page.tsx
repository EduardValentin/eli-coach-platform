import { EmptyState, PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  buttonVariants,
  Card,
  ItemIdentity,
  RowActionsMenu,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eli-coach-platform/ui/primitives";
import { Pencil, Plus, Utensils } from "lucide-react";
import {
  Link,
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type {
  FoodView,
  NutritionTagView,
} from "~/features/nutrition-library/public/foods";
import {
  foodEditorPath,
  NEW_FOOD_PATH,
} from "~/features/nutrition-library/public/paths";
import { nutritionLibraryContext } from "~/features/nutrition-library/server/guards/nutrition-library-context.server";
import { FOOD_ICON_APPEARANCE } from "~/features/nutrition-library/ui/shared/food-icons";
import { TagPill } from "~/features/nutrition-library/ui/shared/tag-pill";

import { CATEGORY_LABELS } from "./food-form";

const COLUMNS = ["Food", "kcal", "Protein", "Carbs", "Fat", "Tags", "Actions"];

const VALUE_CELL = "text-sm text-text-secondary tabular-nums";

export async function loader(args: LoaderFunctionArgs) {
  return args.context.get(nutritionLibraryContext).foodLibrary.list(args);
}

export const meta: MetaFunction = () => [{ title: "Nutrition | Evoa" }];

export default function FoodLibraryRoute() {
  const { foods, tags } = useLoaderData<typeof loader>();

  return (
    <div className="w-full" data-parity-root="NutritionHub">
      <PortalPageHeader
        actions={
          <Link
            className={buttonVariants({ size: "md", variant: "primary" })}
            to={NEW_FOOD_PATH}
          >
            <Plus aria-hidden="true" size={16} />
            New food
          </Link>
        }
        subtitle="Build your food library and recipes."
        title="Nutrition"
      />

      <Card data-parity="food-table" variant="table-panel">
        <Table>
          <TableHeader>
            <TableRow data-parity="food-header-row">
              {COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {foods.length === 0 ? (
              <TableRow>
                <TableCell className="p-0" colSpan={COLUMNS.length}>
                  <EmptyState
                    description="Foods you add appear here."
                    icon={Utensils}
                    title="No foods yet"
                  />
                </TableCell>
              </TableRow>
            ) : (
              foods.map((food) => (
                <FoodRow food={food} key={food.id} tags={tags} />
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function FoodRow({
  food,
  tags,
}: {
  food: FoodView;
  tags: readonly NutritionTagView[];
}) {
  const navigate = useNavigate();
  const foodTags = tags.filter((tag) => food.tagIds.includes(tag.id));

  return (
    <TableRow data-parity="food-row">
      <TableCell>
        <ItemIdentity
          glyphAttributes={{ "data-parity": "food-glyph" }}
          icon={FOOD_ICON_APPEARANCE[food.icon].glyph}
          summary={CATEGORY_LABELS[food.category]}
          summaryAttributes={{ "data-parity": "food-category" }}
          title={food.name}
        />
      </TableCell>
      <TableCell className={VALUE_CELL}>{food.kcal}</TableCell>
      <TableCell className={VALUE_CELL}>{`${food.protein}g`}</TableCell>
      <TableCell className={VALUE_CELL}>{`${food.carb}g`}</TableCell>
      <TableCell className={VALUE_CELL}>{`${food.fat}g`}</TableCell>
      <TableCell>
        <ul className="flex flex-wrap gap-1" data-parity="food-tags">
          {foodTags.map((tag) => (
            <li key={tag.id}>
              <TagPill tag={tag} />
            </li>
          ))}
        </ul>
      </TableCell>
      <TableCell data-parity="food-actions-cell">
        <div
          className="flex items-center justify-end"
          data-parity="library-item-actions"
        >
          <RowActionsMenu
            actions={[
              {
                icon: Pencil,
                label: "Edit",
                name: "edit",
                onSelect: () => void navigate(foodEditorPath(food.id)),
              },
            ]}
            label={`Actions for ${food.name}`}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
