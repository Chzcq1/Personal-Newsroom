import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Users, Calendar, Clock, BookOpen, Tag, Eye, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/hooks/useAnalytics";

function api(path: string) {
  return `${import.meta.env.BASE_URL ?? "/"}api${path}`;
}

async function fetchJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

interface UserProfile {
  id: string;
  firstSeen: string;
  lastSeen: string;
  sessionCount: number;
  timezone: string;
  language: string;
  foundingMember: boolean;
  onboardingCompleted: boolean;
  metadata: Record<string, unknown>;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function UserRow({ user }: { user: UserProfile }) {
  const isRecent = Date.now() - new Date(user.lastSeen).getTime() < 7 * 86_400_000;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b border-border last:border-0">
      {/* Identity */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Shield className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium">{shortId(user.id)}</span>
            {user.foundingMember && (
              <Badge variant="secondary" className="text-xs py-0">Founding</Badge>
            )}
            {user.onboardingCompleted && (
              <Badge variant="outline" className="text-xs py-0">Onboarded</Badge>
            )}
            {isRecent && (
              <Badge className="text-xs py-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {user.timezone} · {user.language.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>Joined {new Date(user.firstSeen).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>Seen {timeAgo(user.lastSeen)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          <span>{user.sessionCount} session{user.sessionCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

export default function UsersAdminPage() {
  const trackedRef = useRef(false);
  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent("PAGE_VIEW", { page: "admin_users" });
    }
  }, []);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchJson(api("/identity/profiles")),
    refetchInterval: 60_000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-users-analytics"],
    queryFn: () => fetchJson(api("/admin/analytics")),
    refetchInterval: 120_000,
  });

  const users: UserProfile[] = usersData?.profiles ?? [];
  const snap = analytics?.snapshot?.users;

  const totalUsers = users.length;
  const foundingMembers = users.filter((u) => u.foundingMember).length;
  const onboarded = users.filter((u) => u.onboardingCompleted).length;
  const activeToday = users.filter(
    (u) => Date.now() - new Date(u.lastSeen).getTime() < 86_400_000,
  ).length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/command-center">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Command Center
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">User Insights</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Anonymous user profiles — no passwords, no PII
          </p>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users",      value: totalUsers,      sub: "All-time",       icon: Users },
          { label: "Active Today",     value: activeToday,     sub: "Last 24 hours",  icon: Eye },
          { label: "Founding Members", value: foundingMembers, sub: "Early adopters", icon: Tag },
          { label: "Onboarded",        value: onboarded,       sub: `${totalUsers > 0 ? Math.round((onboarded / totalUsers) * 100) : 0}% rate`, icon: BookOpen },
        ].map(({ label, value, sub, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border text-muted-foreground">
        <Shield className="h-4 w-4 mt-0.5 shrink-0" />
        <p className="text-xs">
          All identities are anonymous. Each user is identified by a UUID stored in their browser.
          No email, phone, or personal data is collected. No passwords are stored.
        </p>
      </div>

      {/* User list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {isLoading ? "Loading…" : `${totalUsers} Profiles`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-3 py-8 text-muted-foreground">
              <div className="h-4 w-4 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
              <span className="text-sm">Loading profiles…</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No user profiles yet</p>
              <p className="text-xs mt-1">Profiles appear when users first visit the app</p>
            </div>
          ) : (
            <div>
              {users
                .slice()
                .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
                .map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
