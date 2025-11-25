import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const newsRecords = pgTable("news_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  text: text("text").notNull(),
  cid: text("cid").notNull(),
  hash: text("hash").notNull(),
  tx: text("tx"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  timestamp: text("timestamp").notNull(),
  walletAddress: text("wallet_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNewsRecordSchema = createInsertSchema(newsRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertNewsRecord = z.infer<typeof insertNewsRecordSchema>;
export type NewsRecord = typeof newsRecords.$inferSelect;
