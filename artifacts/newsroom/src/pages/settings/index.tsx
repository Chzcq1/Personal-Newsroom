import { Link } from "wouter";
import { ArrowLeft, Send, Heart, ChevronRight, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hasTelegramSettings } from "@/lib/telegramSettings";
import { getInterests } from "@/lib/interestProfile";

export default function SettingsPage() {
  const telegramOk = hasTelegramSettings();
  const interests = getInterests();

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

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-4">
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
                  Receive morning and evening briefings automatically in your Telegram chat
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>

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
                  Select topics like Tesla, Nvidia, Bitcoin to personalise your briefings
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
                <span className="text-lg">👁</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-0.5">Delivery Preview</p>
                <p className="text-sm text-white/50">
                  Preview how your morning and evening briefings will look in Telegram
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
