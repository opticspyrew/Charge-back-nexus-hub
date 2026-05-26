import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import publicRouter from "./public";
import authRouter from "./auth";
import replitAuthRouter from "./replit-auth";
import socialAuthRouter from "./social-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/public", publicRouter);
router.use("/auth/replit", replitAuthRouter);
router.use("/auth", socialAuthRouter);
router.use("/auth", authRouter);

export default router;
