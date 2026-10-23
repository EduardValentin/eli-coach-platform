import { createBrowserRouter, Outlet } from "react-router";
import { Toaster } from "./components/ui/sonner";
import { Home } from "./pages/Home";
import { Book } from "./pages/Book";
import { JoinCall } from "./pages/JoinCall";
import { CheckinJoin } from "./pages/CheckinJoin";
import { DevToggle } from "./components/DevToggle";
import { AppProvider } from "./context/AppContext";
import { StoreProvider } from "./context/StoreContext";
import { NotificationProvider } from "./context/NotificationContext";
import { TrainingProvider } from "./context/TrainingContext";
import { CheckinProvider } from "./context/CheckinContext";
import { AssessmentCallProvider } from "./context/AssessmentCallContext";
import { ClientJourneyProvider } from "./context/ClientJourneyContext";
import { ProgramProvider } from "./context/ProgramContext";
import { MessagingProvider } from "./context/MessagingContext";
import { ResourceProvider } from "./context/ResourceContext";
import { Store } from "./pages/Store";
import { ProductDetails } from "./pages/ProductDetails";
import { CartDrawer } from "./components/CartDrawer";
import { Pricing } from "./pages/Pricing";
import { SelectBundle } from "./pages/SelectBundle";
import { CheckoutStandIn } from "./pages/CheckoutStandIn";
import { CheckoutComplete } from "./pages/CheckoutComplete";
import { InvitationLanding } from "./pages/InvitationLanding";
import { PortalLayout } from "./components/client-portal/PortalLayout";
import { ClientDashboard } from "./pages/client-portal/ClientDashboard";
import { ClientProgram } from "./pages/client-portal/ClientProgram";
import { ClientProgramDocument } from "./pages/client-portal/ClientProgramDocument";
import { ClientMessages } from "./pages/client-portal/ClientMessages";
import { CoachLayout } from "./components/coach-portal/CoachLayout";
import { CoachDashboard } from "./pages/coach-portal/CoachDashboard";
import { CoachAssessmentCalls } from "./pages/coach-portal/CoachAssessmentCalls";
import { CoachMessages } from "./pages/coach-portal/CoachMessages";
import { ClientsList } from "./pages/coach-portal/ClientsList";
import { ClientDetails } from "./pages/coach-portal/ClientDetails";
import { TrainingHub } from "./pages/coach-portal/TrainingHub";
import { ExerciseEditorPage } from "./pages/coach-portal/ExerciseEditorPage";
import { NutritionHub } from "./pages/coach-portal/NutritionHub";
import { FoodEditorPage } from "./pages/coach-portal/FoodEditorPage";
import { ClientProgramPage } from "./pages/coach-portal/ClientProgramPage";
import { ClientProgramDocument as CoachProgramDocument } from "./pages/coach-portal/ClientProgramDocument";
import { ProgramEditorPage } from "./pages/coach-portal/ProgramEditorPage";
import { RecipeBuilderPage } from "./pages/coach-portal/RecipeBuilderPage";
import { NutritionPlanBuilderPage } from "./pages/coach-portal/NutritionPlanBuilderPage";
import { NutritionDayEditorPage } from "./pages/coach-portal/NutritionDayEditorPage";
import { CoachCheckins } from "./pages/coach-portal/CoachCheckins";
import { CoachSettings } from "./pages/coach-portal/CoachSettings";
import { ClientCycleTracker } from "./pages/client-portal/ClientCycleTracker";
import { ClientOnboarding } from "./pages/client-portal/ClientOnboarding";
import { ClientWelcome } from "./pages/client-portal/ClientWelcome";
import { PortalEnded } from "./pages/client-portal/PortalEnded";
import { PaymentMethodStandIn } from "./pages/PaymentMethodStandIn";
import { ClientJourneyGate } from "./components/client-portal/ClientJourneyGate";
import { CoachClientCycle } from "./pages/coach-portal/CoachClientCycle";
import { ClientProfilePage } from "./pages/coach-portal/ClientProfilePage";
import { CycleProvider } from "./context/CycleContext";
import { NutritionProvider } from "./context/NutritionContext";
import { UnitPreferencesProvider } from "./context/UnitPreferencesContext";
import { ClientProfile } from "./pages/client-portal/ClientProfile";
import { ClientSettings } from "./pages/client-portal/ClientSettings";
import { ClientCheckins } from "./pages/client-portal/ClientCheckins";
import { ClientResources as ClientResourcesPage } from "./pages/client-portal/ClientResources";
import { ClientResources as CoachClientResources } from "./pages/coach-portal/ClientResources";
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
          <NutritionProvider>
          <UnitPreferencesProvider>
          <CycleProvider>
            <AssessmentCallProvider>
            <ClientJourneyProvider>
            <ProgramProvider>
            <NotificationProvider>
            <CheckinProvider>
            <MessagingProvider>
            <ResourceProvider>
              <div className="relative min-h-screen bg-surface-subtle text-foreground font-sans selection:bg-brand selection:text-white">
                <Toaster position="top-right" richColors />
                <DevToggle />
                <CartDrawer />
                <Outlet />
              </div>
            </ResourceProvider>
            </MessagingProvider>
            </CheckinProvider>
            </NotificationProvider>
            </ProgramProvider>
            </ClientJourneyProvider>
            </AssessmentCallProvider>
          </CycleProvider>
          </UnitPreferencesProvider>
          </NutritionProvider>
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
        { path: "book/:bookingId/join", Component: JoinCall },
        { path: "store", Component: Store },
        { path: "store/:productId", Component: ProductDetails },
        { path: "pricing", Component: Pricing },
        { path: "select-bundle", Component: SelectBundle },
        { path: "checkout/complete", Component: CheckoutComplete },
        { path: "checkout/:sessionId", Component: CheckoutStandIn },
        { path: "invitation", Component: InvitationLanding },
        { path: "email-preview", Component: EmailPreview },
        { path: "downloads", Component: DownloadPage },
        { path: "privacy", Component: Privacy },
        { path: "terms", Component: Terms },
        {
          element: <RequireSession session="client" />,
          children: [
            {
              element: <ClientJourneyGate />,
              children: [
        {
          path: "portal",
          Component: PortalLayout,
          children: [
            { index: true, Component: ClientDashboard },
            { path: "program", Component: ClientProgram },
            { path: "messages", Component: ClientMessages },
            { path: "cycle", Component: ClientCycleTracker },
            { path: "checkins", Component: ClientCheckins },
            { path: "nutrition", Component: ClientNutrition },
            { path: "resources", Component: ClientResourcesPage },
            { path: "profile", Component: ClientProfile },
            { path: "settings", Component: ClientSettings }
          ]
        },
        { path: "portal/checkins/:checkinId/join", element: <CheckinJoin party="client" /> },
        { path: "portal/program/document", Component: ClientProgramDocument },
        { path: "portal/program/document/:version", Component: ClientProgramDocument },
        { path: "portal/welcome", Component: ClientWelcome },
        { path: "portal/onboarding", Component: ClientOnboarding },
        { path: "portal/ended", Component: PortalEnded },
        { path: "billing/payment-method", Component: PaymentMethodStandIn },
              ]
            },
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
            { path: "assessment-calls", Component: CoachAssessmentCalls },
            { path: "messages", Component: CoachMessages },
            { path: "clients", Component: ClientsList },
            { path: "clients/:id", Component: ClientDetails },
            { path: "clients/:id/program", Component: ClientProgramPage },
            { path: "training", Component: TrainingHub },
            { path: "training/exercises/new", Component: ExerciseEditorPage },
            { path: "training/exercises/:exerciseId", Component: ExerciseEditorPage },
            { path: "nutrition", Component: NutritionHub },
            { path: "nutrition/foods/new", Component: FoodEditorPage },
            { path: "nutrition/foods/:foodId", Component: FoodEditorPage },
            { path: "nutrition/client/:clientId/plan", Component: NutritionPlanBuilderPage },
            { path: "nutrition/client/:clientId/plan/day/:date", Component: NutritionDayEditorPage },
            { path: "checkins", Component: CoachCheckins },
            { path: "clients/:id/cycle", Component: CoachClientCycle },
            { path: "clients/:id/resources", Component: CoachClientResources },
            { path: "clients/:id/profile", Component: ClientProfilePage },
            { path: "profile", Component: EditCoachProfile },
            { path: "settings", Component: CoachSettings },
          ]
        },
        { path: "coach/checkins/:checkinId/join", element: <CheckinJoin party="coach" /> },
        { path: "coach/clients/:id/program/new", Component: ProgramEditorPage },
        { path: "coach/clients/:id/program/draft", Component: ProgramEditorPage },
        { path: "coach/clients/:id/program/document/:version", Component: CoachProgramDocument },
        { path: "coach/nutrition/recipe-builder", Component: RecipeBuilderPage },
        { path: "coach/nutrition/recipe-builder/:recipeId", Component: RecipeBuilderPage },
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
