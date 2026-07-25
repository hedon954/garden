import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const managedThoughts = sqliteTable("managed_thoughts", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").notNull().default("[]"),
  media: text("media").notNull().default("[]"),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const distributionJobs = sqliteTable("distribution_jobs", {
  id: text("id").primaryKey(),
  sourceKind: text("source_kind", { enum: ["post", "column"] }).notNull(),
  sourceSlug: text("source_slug").notNull(),
  platform: text("platform", {
    enum: ["x", "csdn", "zhihu", "juejin"],
  }).notNull(),
  status: text("status", {
    enum: ["queued", "published", "needs_credentials", "failed"],
  })
    .notNull()
    .default("queued"),
  canonicalUrl: text("canonical_url").notNull(),
  externalUrl: text("external_url"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
