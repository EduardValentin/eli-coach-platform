import { createBrowserRouter, Outlet } from "react-router";
import { Toaster } from "sonner";
import { Home } from "./pages/Home";
import { Book } from "./pages/Book";
import { DevToggle } from "./components/DevToggle";
import { AppProvider } from "./context/AppContext";
import { StoreProvider } from "./context/StoreContext";
import { NotificationProvider } from "./context/NotificationContext";
import { TrainingProvider } from "./context/TrainingContext";
import { CheckinProvider } from "./context/CheckinContext";
import { MessagingProvider } from "./context/MessagingContext";
import { Store } from "./pages/Store";
import { ProductDetails } from "./pages/ProductDetails";
import { CartDrawer } from "./components/CartDrawer";
import { Pricing } from "./pages/Pricing";
import { SelectBundle } from "./pages/SelectBundle";
import { PortalLayout } from "./components/client-portal/PortalLayout";
import { ClientDashboard } from "./pages/client-portal/ClientDashboard";
import { ClientMessages } from "./pages/client-portal/ClientMessages";
import { ClientPlan } from "./pages/client-portal/ClientPlan";
import { WorkoutViewer } from "./pages/client-portal/WorkoutViewer";
import { CoachLayout } from "./components/coach-portal/CoachLayout";
import { CoachDashboard } from "./pages/coach-portal/CoachDashboard";
import { CoachMessages } from "./pages/coach-portal/CoachMessages";
import { ClientsList } from "./pages/coach-portal/ClientsList";
import { ClientDetails } from "./pages/coach-portal/ClientDetails";
import { OnboardClient } from "./pages/coach-portal/OnboardClient";
import { TrainingHub } from "./pages/coach-portal/TrainingHub";
import { NutritionHub } from "./pages/coach-portal/NutritionHub";
import { RecipeBuilderPage } from "./pages/coach-portal/RecipeBuilderPage";
import { NutritionPlanBuilderPage } from "./pages/coach-portal/NutritionPlanBuilderPage";
import { NutritionDayEditorPage } from "./pages/coach-portal/NutritionDayEditorPage";
import { PlanBuilderPage } from "./pages/coach-portal/PlanBuilderPage";
import { ClientPlanBuilderPage } from "./pages/coach-portal/ClientPlanBuilderPage";
import { CoachCheckins } from "./pages/coach-portal/CoachCheckins";
import { WorkoutReview } from "./pages/coach-portal/WorkoutReview";
import { WorkoutHistory } from "./pages/coach-portal/WorkoutHistory";
import { CoachSettings } from "./pages/coach-portal/CoachSettings";
import { ClientWorkoutHistory } from "./pages/client-portal/ClientWorkoutHistory";
import { ClientWorkoutReview } from "./pages/client-portal/ClientWorkoutReview";
import { ClientCycleTracker } from "./pages/client-portal/ClientCycleTracker";
import { ClientOnboarding } from "./pages/client-portal/ClientOnboarding";
import { CoachClientCycle } from "./pages/coach-portal/CoachClientCycle";
import { EditClientProfile } from "./pages/coach-portal/EditClientProfile";
import { CycleProvider } from "./context/CycleContext";
import { ClientProfileProvider } from "./context/ClientProfileContext";
import { NutritionProvider } from "./context/NutritionContext";
import { UnitPreferencesProvider } from "./context/UnitPreferencesContext";
import { ClientProfile } from "./pages/client-portal/ClientProfile";
import { ClientSettings } from "./pages/client-portal/ClientSettings";
import { ClientCheckins } from "./pages/client-portal/ClientCheckins";
import { ClientNutrition } from "./pages/client-portal/ClientNutrition";
import { CoachProfileProvider } from "./context/CoachProfileContext";
import { EditCoachProfile } from "./pages/coach-portal/EditCoachProfile";
import { EmailPreview } from "./pages/EmailPreview";
import { DownloadPage } from "./pages/DownloadPage";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";
import { NotFound } from "./pages/NotFound";
import { RequireSession } from "./components/RequireSession";
import { AccessDenied } from "./pages/AccessDenied";
import { SignInFailed } from "./pages/SignInFailed";

function Root() {
  return (
    <AppProvider>
      <StoreProvider>
        <TrainingProvider>
          <CoachProfileProvider>
          <ClientProfileProvider>
          <NutritionProvider>
          <UnitPreferencesProvider>
          <CycleProvider>
          <CheckinProvider>
            <MessagingProvider>
              <NotificationProvider>
                <div className="relative min-h-screen bg-surface-subtle text-foreground font-sans selection:bg-brand selection:text-white">
                  <Toaster position="top-right" richColors />
                  <DevToggle />
                  <CartDrawer />
                  <Outlet />
                </div>
              </NotificationProvider>
            </MessagingProvider>
          </CheckinProvider>
          </CycleProvider>
          </UnitPreferencesProvider>
          </NutritionProvider>
          </ClientProfileProvider>
          </CoachProfileProvider>
        </TrainingProvider>
      </StoreProvider>
    </AppProvider>
  );
}

const baseUrl = import.meta.env.BASE_URL;
const routerBasename = baseUrl === "/" ? baseUrl : baseUrl.replace(/\/+$/, "");

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: Root,
      children: [
        { index: true, Component: Home },
        { path: "book", Component: Book },
        { path: "store", Component: Store },
        { path: "store/:productId", Component: ProductDetails },
        { path: "pricing", Component: Pricing },
        { path: "select-bundle", Component: SelectBundle },
        { path: "email-preview", Component: EmailPreview },
        { path: "downloads", Component: DownloadPage },
        { path: "privacy", Component: Privacy },
        { path: "terms", Component: Terms },
        {
          element: <RequireSession session="client" />,
          children: [
        {
          path: "portal",
          Component: PortalLayout,
          children: [
            { index: true, Component: ClientDashboard },
            { path: "messages", Component: ClientMessages },
            { path: "plan", Component: ClientPlan },
            { path: "history", Component: ClientWorkoutHistory },
            { path: "history/:logId", Component: ClientWorkoutReview },
            { path: "cycle", Component: ClientCycleTracker },
            { path: "checkins", Component: ClientCheckins },
            { path: "nutrition", Component: ClientNutrition },
            { path: "profile", Component: ClientProfile },
            { path: "settings", Component: ClientSettings }
          ]
        },
        { path: "portal/workout/:planId/:weekIdx/:dayIdx", Component: WorkoutViewer },
        { path: "portal/onboarding", Component: ClientOnboarding },
          ]
        },
        {
          element: <RequireSession session="coach" />,
          children: [
        {
          path: "coach",
          Component: CoachLayout,
          children: [
            { index: true, Component: CoachDashboard },
            { path: "messages", Component: CoachMessages },
            { path: "clients", Component: ClientsList },
            { path: "clients/:id", Component: ClientDetails },
            { path: "onboard", Component: OnboardClient },
            { path: "training", Component: TrainingHub },
            { path: "nutrition", Component: NutritionHub },
            { path: "nutrition/recipe-builder", Component: RecipeBuilderPage },
            { path: "nutrition/recipe-builder/:recipeId", Component: RecipeBuilderPage },
            { path: "nutrition/client/:clientId/plan", Component: NutritionPlanBuilderPage },
            { path: "nutrition/client/:clientId/plan/day/:date", Component: NutritionDayEditorPage },
            { path: "training/template-builder", Component: PlanBuilderPage },
            { path: "training/template-builder/:templateId", Component: PlanBuilderPage },
            { path: "training/builder/:clientId", Component: ClientPlanBuilderPage },
            { path: "checkins", Component: CoachCheckins },
            { path: "clients/:id/workout/:logId", Component: WorkoutReview },
            { path: "clients/:id/history", Component: WorkoutHistory },
            { path: "clients/:id/cycle", Component: CoachClientCycle },
            { path: "clients/:id/edit", Component: EditClientProfile },
            { path: "profile", Component: EditCoachProfile },
            { path: "settings", Component: CoachSettings },
          ]
        },
          ]
        },
        { path: "403", Component: AccessDenied },
        { path: "sign-in-failed", Component: SignInFailed },
        // Both spellings render the same page. "404" is the address the owner
        // asked for by name; "*" is what an unknown URL actually lands on. They
        // sit inside the layout route, so the 404 keeps the providers, the
        // cart drawer and the dev toggle that every other page has — the
        // prototype's navigation bar is per-page, not part of this layout, so
        // neither spelling gains chrome production's 404 cannot have.
        { path: "404", Component: NotFound },
        { path: "*", Component: NotFound }
      ],
    },
  ],
  {
    basename: routerBasename,
  },
);
