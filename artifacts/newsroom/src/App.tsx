import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import SavedBriefings from "@/pages/saved-briefings";
import SettingsPage from "@/pages/settings/index";
import DeliverySettingsPage from "@/pages/settings/delivery";
import InterestsPage from "@/pages/settings/interests";
import DeliveryDebugPage from "@/pages/settings/delivery-debug";
import SchedulerPage from "@/pages/settings/scheduler";
import TopicsPage from "@/pages/settings/topics";
import PersonalityPage from "@/pages/settings/personality";
import PreferencesPage from "@/pages/settings/preferences";
import DeliveryPreviewPage from "@/pages/delivery-preview";
import AdminCostsPage from "@/pages/admin-costs";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import FeedQualityPage from "@/pages/admin/feed-quality";
import MyFeedPage from "@/pages/my-feed";
import RelevanceDebugPage from "@/pages/debug/relevance";
import EntitiesDebugPage from "@/pages/debug/entities";
import NarrativesPage from "@/pages/narratives";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/saved" component={SavedBriefings} />
      <Route path="/my-feed" component={MyFeedPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/delivery" component={DeliverySettingsPage} />
      <Route path="/settings/delivery/debug" component={DeliveryDebugPage} />
      <Route path="/settings/interests" component={InterestsPage} />
      <Route path="/settings/scheduler" component={SchedulerPage} />
      <Route path="/settings/topics" component={TopicsPage} />
      <Route path="/settings/personality" component={PersonalityPage} />
      <Route path="/settings/preferences" component={PreferencesPage} />
      <Route path="/delivery-preview" component={DeliveryPreviewPage} />
      <Route path="/admin/costs" component={AdminCostsPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route path="/admin/feed-quality" component={FeedQualityPage} />
      <Route path="/debug/relevance" component={RelevanceDebugPage} />
      <Route path="/debug/entities" component={EntitiesDebugPage} />
      <Route path="/narratives" component={NarrativesPage} />
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
