import { Router, type IRouter } from "express";
import { db, appointmentsTable } from "@workspace/db";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import {
  ListAdminAppointmentsQueryParams,
  UpdateAppointmentStatusBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { serializeAppointment } from "../lib/chatbot";

const router: IRouter = Router();

router.get("/admin/appointments", requireAdmin, async (req, res) => {
  const q = ListAdminAppointmentsQueryParams.parse(req.query);
  const conditions = [];
  if (q.staff) conditions.push(eq(appointmentsTable.requestedStaff, q.staff));
  if (q.status) conditions.push(eq(appointmentsTable.status, q.status));
  if (q.date) {
    const start = new Date(q.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    conditions.push(gte(appointmentsTable.appointmentDate, start));
    conditions.push(lt(appointmentsTable.appointmentDate, end));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(appointmentsTable)
    .where(where)
    .orderBy(sql`${appointmentsTable.appointmentDate} desc`);

  res.json(rows.map(serializeAppointment));
});

router.put("/admin/appointments/:id/status", requireAdmin, async (req, res) => {
  const body = UpdateAppointmentStatusBody.parse(req.body);
  const id = req.params.id;
  const [updated] = await db
    .update(appointmentsTable)
    .set({ status: body.status, updatedAt: new Date() })
    .where(eq(appointmentsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(serializeAppointment(updated));
});

router.delete("/admin/appointments/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const [deleted] = await db
    .delete(appointmentsTable)
    .where(eq(appointmentsTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json({ ok: true });
});

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(appointmentsTable);
  const now = Date.now();
  const stats = {
    total: rows.length,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    upcoming: 0,
  };
  for (const row of rows) {
    stats[row.status]++;
    if (
      (row.status === "pending" || row.status === "confirmed") &&
      row.appointmentDate.getTime() >= now
    ) {
      stats.upcoming++;
    }
  }
  res.json(stats);
});

export default router;
