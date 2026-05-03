import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const uploadsTable = pgTable("uploads", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  objectPath: text("object_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UploadRow = typeof uploadsTable.$inferSelect;
