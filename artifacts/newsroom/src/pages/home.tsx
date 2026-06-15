import React, { useState, useEffect } from "react";
import { useGetTopics, useSummarizeNews } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, FileText, ExternalLink, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Home() {
  const { data: topics, isLoading: topicsLoading } = useGetTopics();
  const summarizeNewsMutation = useSummarizeNews();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const handleTopicClick = (topicId: string) => {
    setSelectedTopicId(topicId);
    summarizeNewsMutation.mutate({ data: { topicId } });
  };

  const loadingMessages = [
    "Scouring the web for the latest articles...",
    "Analyzing recent developments...",
    "Extracting key information...",
    "Synthesizing findings into Thai...",
    "Finalizing your personal briefing..."
  ];

  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (summarizeNewsMutation.isPending) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
      return () => clearInterval(interval);
    } else {
      setLoadingMessageIndex(0);
    }
  }, [summarizeNewsMutation.isPending]);

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Personal AI Newsroom</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-10 max-w-4xl space-y-12">
        {/* Topic Selection */}
        <section className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Select a Topic</h2>
            <p className="text-muted-foreground">Choose what you want to learn about, and our AI will prepare a live briefing in Thai.</p>
          </div>

          {topicsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {topics?.map((topic) => (
                <Card 
                  key={topic.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 ${
                    selectedTopicId === topic.id ? "ring-2 ring-primary border-primary shadow-sm" : ""
                  }`}
                  onClick={() => handleTopicClick(topic.id)}
                  data-testid={`topic-card-${topic.id}`}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full gap-3">
                    <span className="text-4xl">{topic.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{topic.label}</div>
                      <div className="text-xs text-muted-foreground">{topic.labelTh}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {summarizeNewsMutation.isPending && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-20 space-y-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center relative shadow-lg">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium animate-pulse text-foreground">
                  {loadingMessages[loadingMessageIndex]}
                </h3>
                <p className="text-sm text-muted-foreground">This usually takes 5-15 seconds.</p>
              </div>
            </motion.div>
          )}

          {summarizeNewsMutation.isError && (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-destructive/10 text-destructive p-6 rounded-xl text-center space-y-4"
            >
              <p className="font-medium">An error occurred while generating your briefing.</p>
              <Button variant="outline" onClick={() => selectedTopicId && handleTopicClick(selectedTopicId)}>
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </motion.div>
          )}

          {summarizeNewsMutation.isSuccess && summarizeNewsMutation.data && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Summary Card */}
              <Card className="overflow-hidden border-border/50 shadow-sm">
                <div className="bg-primary/5 border-b p-6 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <Badge variant="outline" className="mb-2 bg-background">
                      {summarizeNewsMutation.data.topic.icon} {summarizeNewsMutation.data.topic.labelTh}
                    </Badge>
                    <h2 className="text-2xl font-bold font-sans">
                      สรุปข่าวล่าสุด
                    </h2>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{(summarizeNewsMutation.data.generationTimeMs / 1000).toFixed(1)}s</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{summarizeNewsMutation.data.articleCount} sources</span>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-6 md:p-8">
                  <div className="prose prose-slate max-w-none dark:prose-invert">
                    {summarizeNewsMutation.data.summary.split('\n').map((paragraph, idx) => (
                      paragraph.trim() ? (
                        <p key={idx} className="text-base md:text-lg leading-relaxed text-foreground mb-4 last:mb-0">
                          {paragraph}
                        </p>
                      ) : null
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/50 p-4 border-t text-xs text-muted-foreground flex justify-between">
                  <span>Generated at {format(new Date(summarizeNewsMutation.data.generatedAt), "HH:mm, MMM d, yyyy")}</span>
                  <span>Powered by {summarizeNewsMutation.data.provider}</span>
                </CardFooter>
              </Card>

              {/* Sources */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-muted-foreground" />
                  Source Articles
                </h3>
                <div className="grid gap-3">
                  {summarizeNewsMutation.data.sources.map((article, idx) => (
                    <a 
                      key={idx} 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <Card className="hover:bg-accent/50 transition-colors border-border/50">
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-primary group-hover:underline line-clamp-1">{article.title}</div>
                            {article.source && (
                              <div className="text-xs text-muted-foreground mt-1">{article.source}</div>
                            )}
                          </div>
                          {article.pubDate && (
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(article.pubDate), "MMM d, yyyy")}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
