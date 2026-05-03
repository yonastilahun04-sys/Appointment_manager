import { Router, type IRouter, type Request, type Response } from "express";
import { db, appointmentsTable, uploadsTable } from "@workspace/db";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import {
  ListAdminAppointmentsQueryParams,
  UpdateAppointmentStatusBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { serializeAppointment } from "../lib/chatbot";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/admin/appointments", requireAdmin, async (req: any, res: any) => {
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

router.put("/admin/appointments/:id/status", requireAdmin, async (req: any, res: any) => {
  const body = UpdateAppointmentStatusBody.parse(req.body);
  const id = String(req.params.id);
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

router.delete("/admin/appointments/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);
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

router.get("/admin/stats", requireAdmin, async (_req: Request, res: Response) => {
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

router.get("/admin/patients", requireAdmin, async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(appointmentsTable)
    .orderBy(sql`${appointmentsTable.appointmentDate} desc`);

  const map = new Map<
    string,
    {
      phoneNumber: string;
      fullName: string;
      email: string | null;
      appointments: ReturnType<typeof serializeAppointment>[];
    }
  >();

  for (const row of rows) {
    const key = row.phoneNumber;
    if (!map.has(key)) {
      map.set(key, {
        phoneNumber: row.phoneNumber,
        fullName: row.fullName,
        email: row.email ?? null,
        appointments: [],
      });
    }
    map.get(key)!.appointments.push(serializeAppointment(row));
  }

  const patients = Array.from(map.values()).map((p) => ({
    phoneNumber: p.phoneNumber,
    fullName: p.fullName,
    email: p.email,
    appointmentCount: p.appointments.length,
    lastAppointment: p.appointments[0]?.appointmentDate ?? null,
    appointments: p.appointments,
  }));

  res.json(patients);
});

router.get("/admin/files", requireAdmin, async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(uploadsTable)
    .orderBy(sql`${uploadsTable.uploadedAt} desc`);
  res.json(
    rows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      objectPath: r.objectPath,
      fileSize: r.fileSize,
      mimeType: r.mimeType,
      uploadedAt: r.uploadedAt.toISOString(),
    })),
  );
});

router.post("/admin/files", requireAdmin, async (req: any, res: any) => {
  const { fileName, objectPath, fileSize, mimeType } = req.body as {
    fileName: string;
    objectPath: string;
    fileSize: number;
    mimeType: string;
  };
  if (!fileName || !objectPath || fileSize == null || !mimeType) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [row] = await db
    .insert(uploadsTable)
    .values({
      id: randomUUID(),
      fileName,
      objectPath,
      fileSize,
      mimeType,
    })
    .returning();
  res.status(201).json({
    id: row.id,
    fileName: row.fileName,
    objectPath: row.objectPath,
    fileSize: row.fileSize,
    mimeType: row.mimeType,
    uploadedAt: row.uploadedAt.toISOString(),
  });
});

router.delete("/admin/files/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const [deleted] = await db
    .delete(uploadsTable)
    .where(eq(uploadsTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
