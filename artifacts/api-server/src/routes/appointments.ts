import { Router, type IRouter } from "express";
import { db, appointmentsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { CheckAvailabilityQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/appointments/check-availability", async (req: any, res: any) => {
  const params = CheckAvailabilityQueryParams.parse(req.query);
  const date = params.appointmentDate;
  const conflict = await db
    .select()
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.requestedStaff, params.requestedStaff),
        eq(appointmentsTable.appointmentDate, date),
      ),
    );
  if (conflict.length > 0) {
    res.json({
      available: false,
      message: `${params.requestedStaff} is already booked at that time.`,
    });
    return;
  }
  res.json({ available: true, message: "Slot is available." });
});

export default router;
