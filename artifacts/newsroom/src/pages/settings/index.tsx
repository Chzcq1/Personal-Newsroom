import { Link } from "wouter";
import {
  ArrowLeft, Send, Heart, ChevronRight, Check, X,
  Clock, Layers, Bug, Brain, Zap, BarChart3, Share2, Flame,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hasTelegramSettings } from "@/lib/telegramSettings";
import { getInterests } from "@/lib/interestProfile";
import { getPersonality, PERSONALITY_OPTIONS } from "@/lib/personalitySettings";
import { isExecutiveModeEnabled } from "@/lib/executiveMode";

export default function SettingsPage() {
  const telegramOk = hasTelegramSettings();
  const interests = getInterests();
  const personality = getPersonality();
  const personalityOption = PERSONALITY_OPTIONS.find((p) => p.id === personality);
  const execMode = isExecutiveModeEnabled();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-2">

        {/* Section: Delivery */}
        <p className="text-xs text-white/30 uppercase tracking-wider px-1 pt-2 pb-1">Delivery</p>

        {/* Telegram Delivery */}
        <Link href="/settings/delivery">
          <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#2AABEE]/10 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-[#2AABEE]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-white">Telegram Delivery</p>
                  {telegramOk ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                      <X className="w-3 h-3" /> Not set up
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50">
                  Receive morning and evening briefings automatically
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Delivery Schedule */}
        <Link href="/settings/scheduler">
          <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-0.5">Delivery Schedule</p>
                <p className="text-sm text-white/50">
                  Custom delivery slots · weekday and weekend filters
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Section: Personalisation */}
        <p className="text-xs text-white/30 uppercase tracking-wider px-1 pt-4 pb-1">Personalisation</p>

        {/* Interest Profile */}
        <Link href="/settings/interests">
          <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-white">Interest Profile</p>
                  {interests.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
                      {interests.length} active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                      None selected
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50">
                  Tesla, Nvidia, Bitcoin — topics that matter to you
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Briefing Personality */}
        <Link href="/settings/personality">
          <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-white">Briefing Personality</p>
                  <span className="inline-flex items-center text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    {personalityOption?.name ?? "Analyst"}
                  </span>
                </div>
                <p className="text-sm text-white/50">
                  {personalityOption?.description ?? "Choose the AI writing tone"}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Preferences / Executive Mode */}
        <Link href="/settings/preferences">
          <Card className={`border hover:bg-white/8 transition-colors cursor-pointer group ${execMode ? "bg-amber-500/8 border-amber-500/20" : "bg-white/5 border-white/10"}`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${execMode ? "bg-amber-500/20" : "bg-white/8"}`}>
                <Zap className={`w-5 h-5 ${execMode ? "text-amber-400" : "text-white/40"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-white">Preferences</p>
                  {execMode && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-300 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Exec Mode
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50">
                  Executive Mode — 5-bullet briefings, 90s read time
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Section: Content */}
        <p className="text-xs text-white/30 uppercase tracking-wider px-1 pt-4 pb-1">Content</p>

        {/* Topics */}
        <Link href="/settings/topics">
          <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-0.5">Topics & Sources</p>
                <p className="text-sm text-white/50">
                  Manage built-in topics and add custom RSS feeds
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Section: Tools */}
        <p className="text-xs text-white/30 uppercase tracking-wider px-1 pt-4 pb-1">Tools</p>

        {/* Delivery Analytics */}
        <Link href="/admin/analytics">
          <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-0.5">Delivery Analytics</p>
                <p className="text-sm text-white/50">
                  Quality metrics, signal scoring, story evolution
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Telegram Diagnostics */}
        <Link href="/settings/delivery/debug">
          <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <Bug className="w-5 h-5 text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-0.5">Telegram Diagnostics</p>
                <p className="text-sm text-white/50">
                  Debug bot token, validate chat access, detailed errors
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Delivery Preview */}
        <Link href="/delivery-preview">
          <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Send className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-0.5">Delivery Preview</p>
                <p className="text-sm text-white/50">
                  Preview morning and evening briefings in Telegram format
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Insight Export */}
        <Link href="/insights/export">
          <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <Share2 className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-0.5">Insight Export</p>
                <p className="text-sm text-white/50">
                  Generate shareable intelligence cards from any briefing
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Habit Dashboard */}
        <Link href="/admin/habit">
          <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-0.5">Habit & Engagement</p>
                <p className="text-sm text-white/50">
                  Daily streak, weekly summary, intelligence profile
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

      </main>
    </div>
  );
}
