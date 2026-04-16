import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workspaceRouter from "./workspace";
import stagesRouter from "./stages";
import contactsRouter from "./contacts";
import interactionsRouter from "./interactions";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workspaceRouter);
router.use(stagesRouter);
router.use(contactsRouter);
router.use(interactionsRouter);
router.use(statsRouter);

export default router;
