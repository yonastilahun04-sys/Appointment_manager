import { pgTable, text, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const appointmentsTable = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    fullName: text("full_name").notNull(),
    address: text("address").notNull(),
    phoneNumber: text("phone_number").notNull(),
    reason: text("reason").notNull(),
    requestedStaff: text("requested_staff").notNull(),
    appointmentDate: timestamp("appointment_date", { withTimezone: true }).notNull(),
    status: appointmentStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    staffSlotIdx: uniqueIndex("appointments_staff_slot_idx").on(
      t.requestedStaff,
      t.appointmentDate,
    ),
  }),
);

export type AppointmentRow = typeof appointmentsTable.$inferSelect;
