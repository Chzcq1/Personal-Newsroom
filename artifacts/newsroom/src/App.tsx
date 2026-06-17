import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";

// Core user pages
import Home from "@/pages/home";
import SavedBriefings from "@/pages/saved-briefings";
import OnboardingPage from "@/pages/onboarding";
import NotFound from "@/pages/not-found";

// Sprint 22 — Personalization
import DiscoverPage from "@/pages/discover";
import WatchlistPage from "@/pages/watchlist";
import ProfilePage from "@/pages/profile";

// Settings
import SettingsPage from "@/pages/settings/index";
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
import CommandCenterPage from "@/pages/admin/command-center";

// Auth (Sprint 23)
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import CallbackPage from "@/pages/auth/callback";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* ── Core user routes (6, within budget) ─────────────── */}
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/saved" component={SavedBriefings} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/watchlist" component={WatchlistPage} />
      <Route path="/profile" component={ProfilePage} />

      {/* ── Settings (5 pages, within ≤7 budget) ─────────────── */}
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/topics" component={TopicsPage} />
      <Route path="/settings/personality" component={PersonalityPage} />
      <Route path="/settings/preferences" component={PreferencesPage} />
      <Route path="/settings/signal-mode" component={SignalModePage} />

      {/* ── Hub pages (2) ───────────────────────────────────── */}
      <Route path="/delivery-studio" component={DeliveryStudioPage} />
      <Route path="/intelligence-center" component={IntelligenceCenterPage} />

      {/* ── Admin (5, within budget) ────────────────────────── */}
      <Route path="/admin/command-center" component={CommandCenterPage} />
      <Route path="/admin/economics" component={EconomicsPage} />
      <Route path="/admin/narratives" component={AdminNarrativesPage} />
      <Route path="/admin/efficiency" component={EfficiencyAdminPage} />
      <Route path="/admin/debug" component={DebugCenterPage} />

      {/* ── Auth (Sprint 23) ─────────────────────────────────── */}
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/signup" component={SignupPage} />
      <Route path="/auth/callback" component={CallbackPage} />

      {/* ── Retired routes → redirects ───────────────────────── */}
      <Route path="/my-feed">
        {() => <Redirect to="/" />}
      </Route>
      <Route path="/narratives">
        {() => <Redirect to="/intelligence-center" />}
      </Route>
      <Route path="/insights/export">
        {() => <Redirect to="/profile" />}
      </Route>
      <Route path="/waitlist">
        {() => <Redirect to="/onboarding" />}
      </Route>
      <Route path="/settings/interests">
        {() => <Redirect to="/profile" />}
      </Route>
      <Route path="/admin/system">
        {() => <Redirect to="/admin/command-center" />}
      </Route>
      <Route path="/admin/health">
        {() => <Redirect to="/admin/command-center" />}
      </Route>
      <Route path="/admin/users">
        {() => <Redirect to="/admin/command-center" />}
      </Route>

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
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
