import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import SavedBriefings from "@/pages/saved-briefings";
import SettingsPage from "@/pages/settings/index";
import DeliverySettingsPage from "@/pages/settings/delivery";
import InterestsPage from "@/pages/settings/interests";
import DeliveryPreviewPage from "@/pages/delivery-preview";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/saved" component={SavedBriefings} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/delivery" component={DeliverySettingsPage} />
      <Route path="/settings/interests" component={InterestsPage} />
      <Route path="/delivery-preview" component={DeliveryPreviewPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
