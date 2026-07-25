CREATE TABLE `distribution_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_kind` text NOT NULL,
	`source_slug` text NOT NULL,
	`platform` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`canonical_url` text NOT NULL,
	`external_url` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `managed_thoughts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`media` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `managed_thoughts_slug_unique` ON `managed_thoughts` (`slug`);