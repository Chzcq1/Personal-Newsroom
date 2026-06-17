import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Core user pages
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

// Delivery Studio
import DeliveryStudioPage from "@/pages/delivery-studio";

// Intelligence Center (user-facing insights)
import IntelligenceCenterPage from "@/pages/intelligence-center";

// Admin pages
import EconomicsPage from "@/pages/admin/economics";
import AdminNarrativesPage from "@/pages/admin/narratives";
import EfficiencyAdminPage from "@/pages/admin/efficiency";
import DebugCenterPage from "@/pages/admin/debug";
import SystemDashboardPage from "@/pages/admin/system";
import HealthPage from "@/pages/admin/health";
import CommandCenterPage from "@/pages/admin/command-center";
import UsersAdminPage from "@/pages/admin/users";

// Auth placeholders
import LoginPage from "@/pages/auth/login";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* ── User routes ─────────────────────────────────────── */}
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/saved" component={SavedBriefings} />
      <Route path="/my-feed" component={MyFeedPage} />
      <Route path="/narratives" component={NarrativesPage} />
      <Route path="/waitlist" component={WaitlistPage} />
      <Route path="/insights/export" component={InsightExportPage} />

      {/* ── Settings ────────────────────────────────────────── */}
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/interests" component={InterestsPage} />
      <Route path="/settings/topics" component={TopicsPage} />
      <Route path="/settings/personality" component={PersonalityPage} />
      <Route path="/settings/preferences" component={PreferencesPage} />
      <Route path="/settings/signal-mode" component={SignalModePage} />

      {/* ── Hub pages ───────────────────────────────────────── */}
      <Route path="/delivery-studio" component={DeliveryStudioPage} />
      <Route path="/intelligence-center" component={IntelligenceCenterPage} />

      {/* ── Admin ───────────────────────────────────────────── */}
      <Route path="/admin/command-center" component={CommandCenterPage} />
      <Route path="/admin/users" component={UsersAdminPage} />
      <Route path="/admin/economics" component={EconomicsPage} />
      <Route path="/admin/narratives" component={AdminNarrativesPage} />
      <Route path="/admin/efficiency" component={EfficiencyAdminPage} />
      <Route path="/admin/debug" component={DebugCenterPage} />
      <Route path="/admin/system" component={SystemDashboardPage} />
      <Route path="/admin/health" component={HealthPage} />

      {/* ── Auth (Sprint 21) ────────────────────────────────── */}
      <Route path="/auth/login" component={LoginPage} />

      {/* ── Legacy URL redirects (permanent) ────────────────── */}
      <Route path="/settings/delivery">
        {() => <Redirect to="/delivery-studio" />}
      </Route>
      <Route path="/settings/delivery/debug">
        {() => <Redirect to="/delivery-studio" />}
      </Route>
      <Route path="/settings/delivery/preview-live">
        {() => <Redirect to="/delivery-studio" />}
      </Route>
      <Route path="/settings/delivery/preview-v3">
        {() => <Redirect to="/delivery-studio" />}
      </Route>
      <Route path="/settings/scheduler">
        {() => <Redirect to="/delivery-studio" />}
      </Route>
      <Route path="/settings/intelligence-score">
        {() => <Redirect to="/intelligence-center" />}
      </Route>
      <Route path="/admin/analytics">
        {() => <Redirect to="/intelligence-center" />}
      </Route>
      <Route path="/admin/delivery">
        {() => <Redirect to="/intelligence-center" />}
      </Route>
      <Route path="/admin/system-intelligence">
        {() => <Redirect to="/admin/command-center" />}
      </Route>
      <Route path="/admin/source-trust">
        {() => <Redirect to="/admin/command-center" />}
      </Route>
      <Route path="/admin/costs">
        {() => <Redirect to="/admin/economics" />}
      </Route>
      <Route path="/debug/relevance">
        {() => <Redirect to="/admin/debug" />}
      </Route>
      <Route path="/debug/entities">
        {() => <Redirect to="/admin/debug" />}
      </Route>
      <Route path="/debug/feed-evolution">
        {() => <Redirect to="/admin/debug" />}
      </Route>

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
