import { Router, Request, Response } from "express";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// Example tables (adjust to your actual imports)
import { db } from "../db";
import { appointmentsTable, uploadsTable } from "../db/schema";

// Helper (adjust if you already have one)
function serializeAppointment(a: any) {
  return a;
}

/**
 * UPDATE APPOINTMENT STATUS
 */
router.put(
  "/admin/appointments/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);

      const [updated] = await db
        .update(appointmentsTable)
        .set(req.body)
        .where({ id })
        .returning();

      res.json(serializeAppointment(updated));
    } catch (err) {
      res.status(500).json({ error: "Failed to update appointment" });
    }
  }
);

/**
 * DELETE APPOINTMENT
 */
router.delete(
  "/admin/appointments/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);

      await db.delete(appointmentsTable).where({ id });

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete appointment" });
    }
  }
);

/**
 * ADMIN STATS
 */
router.get(
  "/admin/stats",
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(appointmentsTable);

      const now = Date.now();

      const stats = {
        total: rows.length,
        today: rows.filter(
          (r: any) =>
            new Date(r.date).toDateString() === new Date(now).toDateString()
        ).length,
      };

      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  }
);

/**
 * GET PATIENTS (FROM APPOINTMENTS)
 */
router.get(
  "/admin/patients",
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(appointmentsTable);

      const patients = rows.map((r: any) => r.patient);

      res.json(patients);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  }
);

/**
 * GET FILES
 */
router.get(
  "/admin/files",
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(uploadsTable);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  }
);

/**
 * UPLOAD FILE (placeholder)
 */
router.post(
  "/admin/files",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const [file] = await db
        .insert(uploadsTable)
        .values(req.body)
        .returning();

      res.json(file);
    } catch (err) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

/**
 * DELETE FILE
 */
router.delete(
  "/admin/files/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);

      await db.delete(uploadsTable).where({ id });

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  }
);

export default router;