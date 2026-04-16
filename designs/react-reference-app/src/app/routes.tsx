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
import { PortalLayout } from "./components/portal/PortalLayout";
import { ClientDashboard } from "./pages/portal/ClientDashboard";
import { ClientMessages } from "./pages/portal/ClientMessages";
import { ClientPlan } from "./pages/portal/ClientPlan";
import { WorkoutViewer } from "./pages/portal/WorkoutViewer";
import { CoachLayout } from "./components/coach/CoachLayout";
import { CoachDashboard } from "./pages/coach/CoachDashboard";
import { CoachMessages } from "./pages/coach/CoachMessages";
import { ClientsList } from "./pages/coach/ClientsList";
import { ClientDetails } from "./pages/coach/ClientDetails";
import { OnboardClient } from "./pages/coach/OnboardClient";
import { TrainingHub } from "./pages/coach/TrainingHub";
import { PlanBuilderPage } from "./pages/coach/PlanBuilderPage";
import { ClientPlanBuilderPage } from "./pages/coach/ClientPlanBuilderPage";
import { CoachCheckins } from "./pages/coach/CoachCheckins";
import { WorkoutReview } from "./pages/coach/WorkoutReview";
import { WorkoutHistory } from "./pages/coach/WorkoutHistory";
import { ClientWorkoutHistory } from "./pages/portal/ClientWorkoutHistory";
import { ClientWorkoutReview } from "./pages/portal/ClientWorkoutReview";
import { ClientCycleTracker } from "./pages/portal/ClientCycleTracker";
import { ClientOnboarding } from "./pages/portal/ClientOnboarding";
import { CoachClientCycle } from "./pages/coach/CoachClientCycle";
import { EditClientProfile } from "./pages/coach/EditClientProfile";
import { CycleProvider } from "./context/CycleContext";
import { ClientProfileProvider } from "./context/ClientProfileContext";
import { ClientProfile } from "./pages/portal/ClientProfile";

function Root() {
  return (
    <AppProvider>
      <StoreProvider>
        <TrainingProvider>
          <ClientProfileProvider>
          <CycleProvider>
          <CheckinProvider>
            <MessagingProvider>
              <NotificationProvider>
                <div className="relative min-h-screen bg-[#F8F8F8] text-[#121212] font-sans selection:bg-[#C81D6B] selection:text-white">
                  <Toaster position="top-right" richColors />
                  <DevToggle />
                  <CartDrawer />
                  <Outlet />
                </div>
              </NotificationProvider>
            </MessagingProvider>
          </CheckinProvider>
          </CycleProvider>
          </ClientProfileProvider>
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
            { path: "profile", Component: ClientProfile }
          ]
        },
        { path: "portal/workout/:planId/:weekIdx/:dayIdx", Component: WorkoutViewer },
        { path: "portal/onboarding", Component: ClientOnboarding },
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
            { path: "training/template-builder", Component: PlanBuilderPage },
            { path: "training/template-builder/:templateId", Component: PlanBuilderPage },
            { path: "training/builder/:clientId", Component: ClientPlanBuilderPage },
            { path: "checkins", Component: CoachCheckins },
            { path: "clients/:id/workout/:logId", Component: WorkoutReview },
            { path: "clients/:id/history", Component: WorkoutHistory },
            { path: "clients/:id/cycle", Component: CoachClientCycle },
            { path: "clients/:id/edit", Component: EditClientProfile },
          ]
        }
      ],
    },
  ],
  {
    basename: routerBasename,
  },
);
