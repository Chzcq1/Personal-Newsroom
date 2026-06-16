// ============================================================
// DELIVERY SCHEDULE — Sprint 8 Task A
// Flexible slot-based schedule management
// ============================================================

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Clock, Plus, Trash2, ToggleLeft, ToggleRight, Info, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  loadScheduleSettings,
  saveScheduleSettings,
  addSlot,
  removeSlot,
  toggleSlot,
  updateSlotDaysFilter,
  formatSlotTime,
  getNextDeliveryForSlot,
  getDaysFilterLabel,
  type ScheduleSlot,
  type ScheduleSettings,
} from "@/lib/schedulerSettings";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = [0, 15, 30, 45];
const DAYS_OPTIONS: ScheduleSlot["daysFilter"][] = ["all", "weekdays", "weekends"];

function SlotCard({
  slot,
  onToggle,
  onRemove,
  onDaysChange,
}: {
  slot: ScheduleSlot;
  onToggle: () => void;
  onRemove: () => void;
  onDaysChange: (filter: ScheduleSlot["daysFilter"]) => void;
}) {
  const [nextDelivery, setNextDelivery] = useState("");

  useEffect(() => {
    const update = () => setNextDelivery(getNextDeliveryForSlot(slot));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [slot]);

  const isDefault = slot.id === "morning-default" || slot.id === "evening-default";

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${slot.enabled ? "bg-amber-500/15" : "bg-white/5"}`}>
              <Clock className={`w-5 h-5 ${slot.enabled ? "text-amber-400" : "text-white/30"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-mono text-base font-semibold tracking-tight ${slot.enabled ? "text-white" : "text-white/40"}`}>
                  {formatSlotTime(slot)}
                </span>
                <span className="text-xs text-white/40 font-medium">ICT</span>
                {isDefault && (
                  <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">default</span>
                )}
              </div>
              <p className={`text-sm mt-0.5 ${slot.enabled ? "text-white/60" : "text-white/25"}`}>{slot.label}</p>
              {slot.enabled && nextDelivery && (
                <p className="text-xs text-emerald-400 mt-0.5">Next: {nextDelivery}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={slot.enabled ? "Disable" : "Enable"}
            >
              {slot.enabled
                ? <ToggleRight className="w-5 h-5 text-amber-400" />
                : <ToggleLeft className="w-5 h-5 text-white/30" />}
            </button>
            {!isDefault && (
              <button
                onClick={onRemove}
                className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors"
                title="Remove slot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Days filter */}
        {slot.enabled && (
          <div className="mt-3 flex items-center gap-1.5 pl-13">
            <Calendar className="w-3 h-3 text-white/30 flex-shrink-0" />
            <div className="flex gap-1">
              {DAYS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onDaysChange(opt)}
                  className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                    slot.daysFilter === opt
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-white/35 hover:text-white/60 border border-transparent"
                  }`}
                >
                  {getDaysFilterLabel(opt)}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddSlotForm({ onAdd }: { onAdd: (hour: number, minute: number, label: string, days: ScheduleSlot["daysFilter"]) => void }) {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<ScheduleSlot["daysFilter"]>("all");
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    onAdd(hour, minute, label, days);
    setLabel("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-white/15 rounded-xl text-white/40 hover:text-white/70 hover:border-white/30 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">Add delivery slot</span>
      </button>
    );
  }

  return (
    <Card className="bg-white/5 border-amber-500/20">
      <CardContent className="p-5 space-y-4">
        <p className="text-sm font-medium text-white/80">New delivery slot</p>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-white/40 block mb-1.5">Hour</label>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h} className="bg-[#1a1a1a]">
                  {String(h).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-white/40 block mb-1.5">Minute</label>
            <select
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
            >
              {MINUTE_OPTIONS.map((m) => (
                <option key={m} value={m} className="bg-[#1a1a1a]">
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 block mb-1.5">Label (optional)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={`${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")} Briefing`}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div>
          <label className="text-xs text-white/40 block mb-1.5">Active days</label>
          <div className="flex gap-2">
            {DAYS_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setDays(opt)}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                  days === opt
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    : "border-white/10 text-white/40 hover:border-white/20"
                }`}
              >
                {getDaysFilterLabel(opt)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleAdd}
            size="sm"
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-medium"
          >
            Add slot
          </Button>
          <Button
            onClick={() => setOpen(false)}
            size="sm"
            variant="ghost"
            className="text-white/40 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchedulerPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ScheduleSettings>(() => loadScheduleSettings());

  const handleSave = () => {
    saveScheduleSettings(settings);
    toast({
      title: "Schedule saved",
      description: `${settings.slots.filter((s) => s.enabled).length} active delivery slots.`,
    });
  };

  const handleAdd = (
    hour: number,
    minute: number,
    label: string,
    days: ScheduleSlot["daysFilter"],
  ) => {
    if (settings.slots.length >= 10) {
      toast({ title: "Maximum 10 slots", description: "Remove an existing slot first.", variant: "destructive" });
      return;
    }
    setSettings((prev) => addSlot(prev, hour, minute, label, days));
  };

  const enabledCount = settings.slots.filter((s) => s.enabled).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Delivery Schedule</h1>
            <p className="text-xs text-white/40">
              {enabledCount} active {enabledCount === 1 ? "slot" : "slots"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
          <Info className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/50 leading-relaxed">
            Delivery times are stored locally and shown as reminders. The server sends at{" "}
            <span className="text-white">07:00</span> and{" "}
            <span className="text-white">18:00 ICT</span> by default.
            Custom slot times will be used in a future server-side update.
          </p>
        </div>

        {/* Slots */}
        <div className="space-y-3">
          {settings.slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              onToggle={() => setSettings((prev) => toggleSlot(prev, slot.id))}
              onRemove={() => setSettings((prev) => removeSlot(prev, slot.id))}
              onDaysChange={(filter) =>
                setSettings((prev) => updateSlotDaysFilter(prev, slot.id, filter))
              }
            />
          ))}
        </div>

        {/* Add slot */}
        <AddSlotForm onAdd={handleAdd} />

        {/* How it works */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5">
            <p className="text-sm font-medium mb-3 text-white/70">Delivery pipeline</p>
            <div className="space-y-2.5">
              {[
                "RSS collection across all active topics",
                "Signal scoring ranks articles by importance",
                "Digest compression filters low-signal stories",
                "AI synthesises a Thai-language briefing",
                "Story evolution tracks narrative continuity",
                "Briefing delivered to your Telegram chat",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-bold text-white/40 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-white/45 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          className="w-full bg-white text-black hover:bg-white/90 font-medium"
        >
          Save schedule
        </Button>
      </main>
    </div>
  );
}
