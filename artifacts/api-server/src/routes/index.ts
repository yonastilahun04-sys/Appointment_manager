import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatbotRouter from "./chatbot";
import appointmentsRouter from "./appointments";
import authRouter from "./auth";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatbotRouter);
router.use(appointmentsRouter);
router.use(authRouter);
router.use(adminRouter);

export default router;
