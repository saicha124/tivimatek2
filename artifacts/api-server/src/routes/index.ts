import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stalkerRouter from "./stalker";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stalkerRouter);

export default router;
