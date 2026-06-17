import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";

export const trendItems = pgTable(
  "trend_items",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    url: text("url").notNull(),
    entityTags: text("entity_tags").notNull().default("[]"),
    topicTags: text("topic_tags").notNull().default("[]"),
    publishedAt: timestamp("published_at"),
    engagementScore: integer("engagement_score").notNull().default(0),
    sourceTrustScore: integer("source_trust_score").notNull().default(50),
    language: text("language").notNull().default("en"),
    ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => ({
    sourceIdx: index("trend_items_source_idx").on(table.source),
    ingestedAtIdx: index("trend_items_ingested_at_idx").on(table.ingestedAt),
    expiresAtIdx: index("trend_items_expires_at_idx").on(table.expiresAt),
  }),
);
