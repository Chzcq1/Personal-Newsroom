import { pgTable, text, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliverySchedulesTable = pgTable("delivery_schedules", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  label: text("label").notNull(),
  time: text("time").notNull(),
  dayFilter: text("day_filter").default("daily").notNull(),
  channel: text("channel").default("telegram").notNull(),
  active: boolean("active").default(true).notNull(),
  telegramChatId: text("telegram_chat_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDeliveryScheduleSchema = createInsertSchema(deliverySchedulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeliverySchedule = z.infer<typeof insertDeliveryScheduleSchema>;
export type DeliverySchedule = typeof deliverySchedulesTable.$inferSelect;
