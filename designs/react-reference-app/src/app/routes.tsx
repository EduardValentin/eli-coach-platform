import { createBrowserRouter, Outlet } from "react-router";
import { Toaster } from "sonner";
import { Home } from "./pages/Home";
import { Book } from "./pages/Book";
import { DevToggle } from "./components/DevToggle";
import { AppProvider } from "./context/AppContext";
import { StoreProvider } from "./context/StoreContext";
import { NotificationProvider } from "./context/NotificationContext";
import { TrainingProvider } from "./context/TrainingContext";
import { Store } from "./pages/Store";
import { ProductDetails } from "./pages/ProductDetails";
import { CartDrawer } from "./components/CartDrawer";
import { Pricing } from "./pages/Pricing";
import { SelectBundle } from "./pages/SelectBundle";
import { PortalLayout } from "./components/portal/PortalLayout";
import { ClientDashboard } from "./pages/portal/ClientDashboard";
import { ClientMessages } from "./pages/portal/ClientMessages";
import { ClientPlan } from "./pages/portal/ClientPlan";
import { CoachLayout } from "./components/coach/CoachLayout";
import { CoachDashboard } from "./pages/coach/CoachDashboard";
import { CoachMessages } from "./pages/coach/CoachMessages";
import { ClientsList } from "./pages/coach/ClientsList";
import { ClientDetails } from "./pages/coach/ClientDetails";
import { OnboardClient } from "./pages/coach/OnboardClient";
import { TrainingHub } from "./pages/coach/TrainingHub";
import { PlanBuilderPage } from "./pages/coach/PlanBuilderPage";

function Root() {
  return (
    <AppProvider>
      <StoreProvider>
        <TrainingProvider>
          <NotificationProvider>
            <div className="relative min-h-screen bg-[#F8F8F8] text-[#121212] font-sans selection:bg-[#C81D6B] selection:text-white">
              <Toaster position="top-right" richColors />
              <DevToggle />
              <CartDrawer />
              <Outlet />
            </div>
          </NotificationProvider>
        </TrainingProvider>
      </StoreProvider>
    </AppProvider>
  );
}

export const router = createBrowserRouter([
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
          { path: "plan", Component: ClientPlan }
        ]
      },
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
          { path: "training/builder", Component: PlanBuilderPage },
        ]
      }
    ],
  },
]);