# Draft — Manage the Food and Recipe Libraries

**Status:** paused draft, not published to Linear. Nutrition planning is on hold while the nutrition prototype is reworked; re-verify this draft against the prototype before publishing.
**Intended relations on publish:** parent GEN-175 (coach portal epic) · blocked by GEN-178 (coach portal shell). The follow-up client meal-plans (coach side) story would be blocked by this one; the client-side meal view belongs to GEN-177 (client portal epic).
**PRD grounding:** §10 Nutrition Management (data model, reqs 1–7), Flow 19.

---

## User Story
As the coach, I want a food library and a recipe builder, so that I can compose reusable recipes with accurate macros to plan client meals from.

## Acceptance Criteria
- [ ] A signed-in coach can open the Nutrition area from the coach portal navigation; it presents Foods, Recipes, and Meal Plans tabs, with Meal Plans showing its empty state (its feature arrives with the meal-plans story). Non-COACH users cannot access these pages or APIs.
- [ ] The coach can create and edit foods — name, category, optional icon, reference macros per 100 g, and default portion size; the Foods tab offers a searchable catalog with category filters (table on desktop, cards on small screens), a tag board for assigning tags to foods, and a swap-groups view to create equivalence groups and assign foods to them (PRD §10 reqs 1–2).
- [ ] The coach creates and edits recipes in a dedicated full-screen builder: ingredients come from a searchable food sidebar via drag-and-drop or one-click add — each starting at the food's default portion — with per-ingredient grams and cooking method, plus prep/cook minutes and step-by-step instructions; saving requires a recipe name (PRD §10 req 3).
- [ ] Adding an ingredient suggests that food's tags on the recipe; the coach can keep, adjust, or remove them, and a suggested tag no longer backed by any ingredient is visibly flagged for keep-or-remove (PRD §10 req 4).
- [ ] Recipe macros compute automatically from the ingredients' per-100 g values, with an explicit manual-override mode (PRD §10 req 5).
- [ ] A recipe can carry an uploaded photo (replaceable and removable) or a chosen meal icon, shown wherever the recipe appears (PRD §10 req 6).
- [ ] The Recipes tab lists recipe cards with search and combinable filters — meal-time, cycle-phase, and dietary tags, plus calorie bands under 200/500/600 kcal — with a clear-filters action and an empty state when nothing matches (PRD §10 req 7).
- [ ] The visual design copies the prototype — layout, components, and interaction patterns match the reference screens listed in Source Context.

## Technical Notes
- Routes `/coach/nutrition` (tab-addressable) and `/coach/nutrition/recipe-builder[/:recipeId]` in the coach surface.
- Feature module per the established pattern; Drizzle `app`-schema tables for foods, tags, equivalence groups, and recipes with ingredient rows; coach-role-authorized endpoints.
- Seed the fixed tag taxonomy per PRD §10's four families; there is no tag-management UI.
- Store and serve recipe photos via the store's asset approach (as GEN-183 does for exercise videos); the prototype fakes them with local data URLs.
- Drag-and-drop must work on touch, as in the plan builders.
- Keep recipe macro math (per-100 g scaling, override precedence) a reusable domain calculation — the meal-plans story computes slot and day totals from it.

## Source Context
- Prototype: `designs/react-reference-app/src/app/pages/coach-portal/NutritionHub.tsx` (tabs), `components/coach-portal/nutrition/FoodLibrary.tsx` + `FoodFormDialog` + `FoodTagBoard` + `EquivalenceGroups` (Foods tab views), `RecipeLibrary.tsx` (filters, cards), `pages/coach-portal/RecipeBuilderPage.tsx` (builder), `context/NutritionContext.tsx` (Food/Tag/EquivalenceGroup/Recipe shapes and macro helpers).
- PRD: §10 Nutrition Management — data model and reqs 1–7; Flow 19.
- Production: `apps/platform/src/routes.ts`, `apps/platform/src/surfaces/coach-portal/`, `apps/platform/src/features/store/` (asset pattern).

## Out of Scope
- Client meal plans and the Meal Plans tab beyond its empty state (next story), and the client detail page's nutrition card.
- The client-side nutrition page (client portal epic).
- Food and recipe deletion (no PRD requirement; not surfaced in the prototype UI).
- Tag taxonomy management (fixed set per PRD §10).
