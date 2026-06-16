import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Layers, Lock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Topic {
  id: string;
  label: string;
  labelTh: string;
  icon: string;
  isCustom: boolean;
  createdAt?: string;
  sourceCount?: number;
}

const BUILT_IN_ICON_COLORS: Record<string, string> = {
  ai: "bg-violet-500/10 text-violet-400",
  technology: "bg-blue-500/10 text-blue-400",
  stocks: "bg-green-500/10 text-green-400",
  economy: "bg-amber-500/10 text-amber-400",
  politics: "bg-red-500/10 text-red-400",
};

function TopicCard({ topic, onDelete }: { topic: Topic; onDelete?: (id: string) => void }) {
  const iconColor = BUILT_IN_ICON_COLORS[topic.id] ?? "bg-slate-500/10 text-slate-400";

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-white">{topic.label}</p>
            {topic.isCustom && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">Custom</span>
            )}
            {!topic.isCustom && (
              <Lock className="w-3 h-3 text-white/20" />
            )}
          </div>
          <p className="text-xs text-white/40">{topic.labelTh}</p>
          {topic.isCustom && topic.sourceCount !== undefined && (
            <p className="text-xs text-white/30 mt-0.5">{topic.sourceCount} RSS source{topic.sourceCount !== 1 ? "s" : ""}</p>
          )}
        </div>
        {topic.isCustom && onDelete && (
          <button
            onClick={() => onDelete(topic.id)}
            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </CardContent>
    </Card>
  );
}

interface CreateFormData {
  id: string;
  label: string;
  labelTh: string;
  keywords: string;
  sourceUrl: string;
  sourceName: string;
}

const EMPTY_FORM: CreateFormData = {
  id: "",
  label: "",
  labelTh: "",
  keywords: "",
  sourceUrl: "",
  sourceName: "",
};

function generateId(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 30);
}

export default function TopicsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFormData>(EMPTY_FORM);

  const { data: topics = [], isLoading } = useQuery<Topic[]>({
    queryKey: ["topics"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/topics`);
      if (!res.ok) throw new Error("Failed to load topics");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFormData) => {
      const res = await fetch(`${BASE}/api/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.id || generateId(data.label),
          label: data.label,
          labelTh: data.labelTh,
          keywords: data.keywords.split(",").map((k) => k.trim()).filter(Boolean),
          sources: data.sourceUrl
            ? [{ name: data.sourceName || data.label, url: data.sourceUrl }]
            : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create topic");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast({ title: "Topic created", description: "Your custom topic has been added." });
    },
    onError: (err) => {
      toast({
        title: "Failed to create topic",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (topicId: string) => {
      const res = await fetch(`${BASE}/api/topics/${topicId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete topic");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      toast({ title: "Topic deleted" });
    },
    onError: (err) => {
      toast({
        title: "Failed to delete topic",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const builtIn = topics.filter((t) => !t.isCustom);
  const custom = topics.filter((t) => t.isCustom);

  const handleLabelChange = (label: string) => {
    setForm((f) => ({
      ...f,
      label,
      id: f.id || generateId(label),
    }));
  };

  const handleSubmit = () => {
    if (!form.label.trim() || !form.labelTh.trim() || !form.sourceUrl.trim()) {
      toast({ title: "Missing fields", description: "Label, Thai label, and at least one source URL are required.", variant: "destructive" });
      return;
    }
    createMutation.mutate(form);
  };

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
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Topics</h1>
            <p className="text-xs text-white/40">Manage briefing topics and RSS sources</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Built-in topics */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Built-in Topics</h2>
            <Lock className="w-3 h-3 text-white/20" />
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center gap-2 py-4 text-white/30 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading topics…
              </div>
            ) : (
              builtIn.map((t) => <TopicCard key={t.id} topic={t} />)
            )}
          </div>
        </section>

        {/* Custom topics */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">
              Custom Topics {custom.length > 0 && `(${custom.length})`}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm((v) => !v)}
              className="gap-1.5 border-white/20 text-white/70 hover:text-white hover:border-white/40 text-xs"
            >
              {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm ? "Cancel" : "Add Topic"}
            </Button>
          </div>

          {/* Create form */}
          {showForm && (
            <Card className="bg-white/5 border-white/10 mb-3">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-medium text-white mb-1">New Custom Topic</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">English Label *</label>
                    <input
                      type="text"
                      value={form.label}
                      onChange={(e) => handleLabelChange(e.target.value)}
                      placeholder="e.g. Climate Tech"
                      className="w-full text-sm bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Thai Label *</label>
                    <input
                      type="text"
                      value={form.labelTh}
                      onChange={(e) => setForm((f) => ({ ...f, labelTh: e.target.value }))}
                      placeholder="e.g. เทคโนโลยีสีเขียว"
                      className="w-full text-sm bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1 block">Topic ID</label>
                  <input
                    type="text"
                    value={form.id}
                    onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                    placeholder="auto-generated from label"
                    className="w-full text-sm bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white/60 placeholder-white/20 focus:outline-none focus:border-white/30 font-mono"
                  />
                  <p className="text-[10px] text-white/20 mt-1">Lowercase letters, numbers, hyphens only</p>
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1 block">RSS Feed URL *</label>
                  <input
                    type="url"
                    value={form.sourceUrl}
                    onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                    placeholder="https://example.com/feed.xml"
                    className="w-full text-sm bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1 block">Source Name</label>
                  <input
                    type="text"
                    value={form.sourceName}
                    onChange={(e) => setForm((f) => ({ ...f, sourceName: e.target.value }))}
                    placeholder="e.g. CleanTechnica"
                    className="w-full text-sm bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1 block">Keywords (for personal feed matching)</label>
                  <input
                    type="text"
                    value={form.keywords}
                    onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                    placeholder="solar, wind energy, EV, carbon capture"
                    className="w-full text-sm bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                  />
                  <p className="text-[10px] text-white/20 mt-1">Comma-separated</p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="w-full bg-white text-black hover:bg-white/90 font-medium gap-2"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Create Topic</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Custom topic list */}
          {custom.length === 0 && !showForm ? (
            <div className="py-8 text-center text-white/30">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No custom topics yet</p>
              <p className="text-xs mt-1">Add a topic with any RSS feed to extend your briefings</p>
            </div>
          ) : (
            <div className="space-y-2">
              {custom.map((t) => (
                <TopicCard
                  key={t.id}
                  topic={t}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
