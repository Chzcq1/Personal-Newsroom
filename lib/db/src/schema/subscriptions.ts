import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  planId: text("plan_id").notNull(),
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: text("cancel_at_period_end").notNull().default("false"),
  paymentProvider: text("payment_provider"),
  externalSubscriptionId: text("external_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  subscriptionId: text("subscription_id"),
  amountThb: integer("amount_thb").notNull(),
  status: text("status").notNull().default("pending"),
  paymentProvider: text("payment_provider").notNull().default("promptpay"),
  externalPaymentId: text("external_payment_id"),
  webhookReceived: text("webhook_received").notNull().default("false"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
