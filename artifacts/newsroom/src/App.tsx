import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Core
import Home from "@/pages/home";
import SavedBriefings from "@/pages/saved-briefings";
import MyFeedPage from "@/pages/my-feed";
import NarrativesPage from "@/pages/narratives";
import WaitlistPage from "@/pages/waitlist";
import OnboardingPage from "@/pages/onboarding";
import InsightExportPage from "@/pages/insights/export";
import NotFound from "@/pages/not-found";

// Settings
import SettingsPage from "@/pages/settings/index";
import InterestsPage from "@/pages/settings/interests";
import TopicsPage from "@/pages/settings/topics";
import PersonalityPage from "@/pages/settings/personality";
import PreferencesPage from "@/pages/settings/preferences";
import SignalModePage from "@/pages/settings/signal-mode";

// Sprint 19: Consolidated pages
import DeliveryStudioPage from "@/pages/delivery-studio";
import IntelligenceCenterPage from "@/pages/intelligence-center";

// Admin (kept as-is)
import EconomicsPage from "@/pages/admin/economics";
import AdminNarrativesPage from "@/pages/admin/narratives";
import EfficiencyAdminPage from "@/pages/admin/efficiency";
import DebugCenterPage from "@/pages/admin/debug";

// Legacy redirects — keep old URLs alive so bookmarks don't break
import DeliverySettingsPage from "@/pages/settings/delivery";
import DeliveryDebugPage from "@/pages/settings/delivery-debug";
import SchedulerPage from "@/pages/settings/scheduler";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import AdminDeliveryPage from "@/pages/admin/delivery";
import SystemIntelligencePage from "@/pages/admin/system-intelligence";
import SourceTrustPage from "@/pages/admin/source-trust";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* ── Core user routes ─────────────────────────────────── */}
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/saved" component={SavedBriefings} />
      <Route path="/my-feed" component={MyFeedPage} />
      <Route path="/narratives" component={NarrativesPage} />
      <Route path="/waitlist" component={WaitlistPage} />
      <Route path="/insights/export" component={InsightExportPage} />

      {/* ── Settings ─────────────────────────────────────────── */}
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/interests" component={InterestsPage} />
      <Route path="/settings/topics" component={TopicsPage} />
      <Route path="/settings/personality" component={PersonalityPage} />
      <Route path="/settings/preferences" component={PreferencesPage} />
      <Route path="/settings/signal-mode" component={SignalModePage} />

      {/* ── Sprint 19: Consolidated hubs ─────────────────────── */}
      <Route path="/delivery-studio" component={DeliveryStudioPage} />
      <Route path="/intelligence-center" component={IntelligenceCenterPage} />

      {/* ── Admin ─────────────────────────────────────────────── */}
      <Route path="/admin/economics" component={EconomicsPage} />
      <Route path="/admin/narratives" component={AdminNarrativesPage} />
      <Route path="/admin/efficiency" component={EfficiencyAdminPage} />
      <Route path="/admin/debug" component={DebugCenterPage} />

      {/* ── Legacy URLs (keep for backward compat) ───────────── */}
      <Route path="/settings/delivery" component={DeliverySettingsPage} />
      <Route path="/settings/delivery/debug" component={DeliveryDebugPage} />
      <Route path="/settings/scheduler" component={SchedulerPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route path="/admin/delivery" component={AdminDeliveryPage} />
      <Route path="/admin/system-intelligence" component={SystemIntelligencePage} />
      <Route path="/admin/source-trust" component={SourceTrustPage} />

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
