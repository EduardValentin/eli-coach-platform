import { useRef, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { Button } from '../../components/ui/button';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../components/ui/tabs';
import { FoodLibrary } from '../../components/coach-portal/nutrition/FoodLibrary';
import { RecipeLibrary } from '../../components/coach-portal/nutrition/RecipeLibrary';
import { ClientPlansTab } from '../../components/coach-portal/nutrition/ClientPlansTab';
import { useAppState } from '../../context/AppContext';

const MVP_TABS = new Set(['foods', 'recipes']);
const POST_MVP_TABS = new Set(['foods', 'recipes', 'plans']);

export function NutritionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { appState } = useAppState();
  const isPostMvp = appState.prototypeMode === 'post-mvp';
  const validTabs = isPostMvp ? POST_MVP_TABS : MVP_TABS;
  const rawTab = searchParams.get('tab') ?? 'foods';
  const activeTab = validTabs.has(rawTab) ? rawTab : 'foods';

  const chosenTab = useRef<string | null>(null);
  const chooseTab = (tab: string) => {
    chosenTab.current = tab;
    setSearchParams({ tab }, { replace: true });
  };
  const focusWhenChosen = (tab: string) => (trigger: HTMLButtonElement | null) => {
    if (!trigger || chosenTab.current !== tab) return;
    chosenTab.current = null;
    trigger.focus();
  };

  const tabsIn = (content: string) => (
    <TabsList>
      <TabsTrigger
        ref={content === 'foods' ? focusWhenChosen('foods') : undefined}
        value="foods"
      >
        Foods
      </TabsTrigger>
      <TabsTrigger
        ref={content === 'recipes' ? focusWhenChosen('recipes') : undefined}
        value="recipes"
      >
        Recipes
      </TabsTrigger>
      {isPostMvp && (
        <TabsTrigger
          ref={content === 'plans' ? focusWhenChosen('plans') : undefined}
          value="plans"
        >
          Meal Plans
        </TabsTrigger>
      )}
    </TabsList>
  );

  const headerActions: Record<string, ReactNode> = {
    foods: (
      <Button asChild variant="primary" size="md">
        <Link to="/coach/nutrition/foods/new" state={{ library: location.search }}>
          <Plus aria-hidden="true" />
          New food
        </Link>
      </Button>
    ),
    recipes: (
      <Button asChild variant="primary" size="md">
        <Link to="/coach/nutrition/recipe-builder">
          <Plus aria-hidden="true" />
          New recipe
        </Link>
      </Button>
    ),
  };

  return (
    <div className="w-full" data-parity-root="NutritionHub">
      <PortalPageHeader
        title="Nutrition"
        subtitle={
          isPostMvp
            ? 'Build your food library, recipes, and client meal plans.'
            : 'Build your food library and recipes.'
        }
        actions={headerActions[activeTab]}
      />

      <Tabs
        variant="segmented"
        value={activeTab}
        onValueChange={chooseTab}
        className="w-full"
      >
        <TabsContent value="foods">
          <FoodLibrary tabs={tabsIn('foods')} />
        </TabsContent>
        <TabsContent value="recipes">
          <RecipeLibrary tabs={tabsIn('recipes')} />
        </TabsContent>
        {isPostMvp && (
          <TabsContent value="plans">
            <div className="mb-6">{tabsIn('plans')}</div>
            <ClientPlansTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
