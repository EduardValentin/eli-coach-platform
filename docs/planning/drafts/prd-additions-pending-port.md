# PRD additions pending port into the lean PRD

These sections were written on the planning branch against the previous PRD structure and approved in review, but they were never merged to `main`. PR #205 then replaced `PRD.md` with the lean version, whose Open Question 6 still asks for the nutrition specification. This file preserves the approved content so it can be ported into the lean PRD's style (numbered Business Rules and Functional Requirements) when the relevant planning resumes.

Review decisions that shaped this content:

- Meal adherence tracking and nutrition block feedback are out of MVP (deferred).
- No client notification on meal-plan changes; there is no notification system in MVP.
- The coach can edit a client's cycle profile and cycle notes but never her period log entries.

## 1. Coach-editable cycle profile

Business rule wording (replaces "visible to the coach" in Business Rule 43):

> The profile is created during client self-onboarding and can be viewed and edited by the coach; the client's period log entries remain read-only for the coach.

Coach-side functional requirement (Coach Portal, Clients):

> The coach can edit the client's cycle profile — regularity, average cycle length, average period length, conditions, and cycle notes — from the client profile edit page. Period log entries are never editable by the coach.

## 2. Client self-onboarding: food preferences step

Insert between the conditions-and-symptoms step and the notes step (Accounts and Onboarding, Client self-onboarding):

> **Step 4 — Food Preferences:** The client sets her dietary flags, allergens, and disliked foods.

Notes becomes Step 5, and the completion requirement reads: "On completion the menstrual cycle profile and food preferences are saved and the client lands on the portal dashboard."

## 3. Nutrition Management

### Objective

Give the coach a food and recipe library and a per-client meal-planning workflow — aligned to each client's calorie and macro targets and her menstrual cycle phases — and give the client a clear daily view of her coach-built meal plan with controlled flexibility.

### Data Model

**Food**

* Name, category (protein, carb, fat, legume, extra, seasoning), optional visual icon
* Reference macros per 100 g (kcal, protein, carbs, fat) and a default portion size in grams
* Tags, and optional membership in one equivalence group

**Equivalence Group**

* A named set of interchangeable foods (e.g., lean proteins); swapping a food for a group sibling rescales grams to preserve the original calorie contribution

**Tag**

* Four families: meal-time (Breakfast, Lunch, Dinner, Snack, Pre-workout, Post-workout), cycle-phase (Menstrual, Follicular, Ovulatory, Luteal), nutrient (e.g., Iron-rich, Omega-3, Magnesium, Anti-inflammatory), and dietary (e.g., Vegetarian, Lactose-free)
* Tags apply to foods and recipes; a recipe's meal-time tags define its meal roles

**Recipe**

* Name, optional photo or meal icon
* Ingredients (food, grams, cooking method: raw, boiled, grilled, baked, pan-fried, steamed), prep and cook minutes, step-by-step instructions
* Meal roles and tags
* Macros computed from the ingredients' per-100 g values, with an optional manual override

**Client Meal Plan**

* One per client: a daily calorie/macro target seeded from the client's profile targets, optional per-cycle-phase calorie overrides, and a series of 14-day blocks — one active, earlier ones kept as read-only history

**Plan Block, Day, and Meal Slot**

* A block spans 14 consecutive days; each day is stamped with the client's expected cycle phase for that date (absent for clients without an active cycle)
* Each day has meal slots — by default Breakfast, Lunch, Dinner, and Snack with soft calorie budgets of 25/30/30/15% of the day's target
* A slot holds the coach's chosen recipe, a portion multiplier (0.5×–2× in 0.25 steps), coach-approved alternative recipes, coach-set ingredient swaps within equivalence groups, and the client's currently selected option

**Client Food Preferences**

* Per client: dietary flags, allergens, and disliked foods, captured during client self-onboarding; they inform planning warnings

### Functional Requirements

#### Food Library

1. The coach can create and edit foods.
2. The food library offers name search and category filters, a tag board for managing food tags, and an equivalence-groups view to create groups and assign foods.

#### Recipe Library and Builder

3. The coach creates and edits recipes in a dedicated builder: ingredients are added from the food library (drag-and-drop or one-click) with grams and cooking method per ingredient, plus prep/cook time, instructions, meal roles, and tags.
4. Adding an ingredient suggests tags carried by that food; the coach can keep, adjust, or remove them, and suggested tags no longer backed by any ingredient are highlighted for review.
5. Recipe macros are calculated automatically from ingredients and can be manually overridden.
6. A recipe can carry a photo or a chosen meal icon, used wherever the recipe appears.
7. The recipe library offers search plus filters by meal-time, cycle-phase, and dietary tags, and by calorie bands (under 200 / 500 / 600 kcal).

#### Client Meal Plans (Coach Side)

8. The coach reaches a client's meal plan from the nutrition area's per-client list and from the client detail page.
9. Opening a client with no plan starts a 14-day block automatically: the daily target is seeded from her profile targets and each day is phase-stamped from her cycle data.
10. The plan overview shows a block summary (average kcal per day, meals planned, phase distribution, average versus target), a two-week calendar of day cards with per-day calorie and macro meters against that day's target, and past blocks in read-only mode.
11. The coach can set per-phase calorie overrides (500–5000 kcal) that replace the default target on days of that phase; saving shows a confirmation of each change, and an override can be reset to the default.
12. Editing a day, the coach fills each meal slot from a recipe picker scoped to that slot's meal role, adjusts the portion multiplier, curates coach-approved alternatives, and sets ingredient swaps limited to equivalence-group siblings with grams rescaled to preserve calories.
13. When a chosen recipe contains a food the client dislikes, the coach sees a warning naming the ingredients; the warning never blocks the choice.
14. Each phase-stamped day shows a short informational nutrition nudge for that phase; the system never changes targets or meals on its own.
15. Day edits are drafted and saved explicitly, with an itemized preview of the changes and a save-or-discard prompt when leaving with unsaved edits.
16. A day's meals can be applied to all other same-phase days in the block, with a preview of which days would be filled or overwritten.
17. A shopping list aggregates the block's ingredients — respecting portions and swaps — grouped by food category, viewable for the whole block or per week.
18. When a block ends, the coach chooses to carry it over (same structure on new dates with fresh phase stamps) or start a new empty block; the finished block joins the history.
19. For clients without an active menstrual cycle, meal plans work identically with no phase stamps, phase overrides, phase nudges, or apply-to-phase.

#### Client Meal Plan (Client Side)

20. The client sees her active block as a day strip (dates, phase dots, planned calories) and a day view showing the phase, calorie and macro totals against her target, and each meal.
21. The day view presents her goal context: primary goal, the day's calorie target, and its difference versus maintenance calories.
22. Each meal shows its effective recipe — her selection or the coach's pick — with macros, time, and cooking methods; opening it reveals ingredients with amounts and the instructions.
23. Where the coach provided alternatives, the client can swap a meal among the coach-approved options only; the coach's pick stays labeled, the swap asks for confirmation, and it is reversible.
24. The client can open the block's shopping list.
25. Without a plan, the client sees a friendly empty state. Clients cannot change portions, ingredients, targets, or anything beyond the coach-approved options.

### Flows

**Coach builds a client meal plan.** Coach opens the nutrition area → maintains foods and recipes → opens a client's meal plan → a block starts with profile-seeded targets and phase-stamped days → sets per-phase calorie overrides → fills a day's meal slots from the recipe picker → adjusts portions, alternatives, and ingredient swaps → applies the day to all same-phase days → reviews the shopping list.

**Client follows her meal plan.** Client opens her nutrition page → picks a day from the block strip → reviews targets and meals → opens a recipe for ingredients and instructions → swaps a meal to a coach-approved alternative → checks the shopping list.

## 4. Deferred entry

- Meal adherence tracking and nutrition block feedback (client meal check-off, block review metrics)
