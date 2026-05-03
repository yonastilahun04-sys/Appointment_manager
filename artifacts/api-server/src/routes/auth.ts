import { Router, type IRouter } from "express";
import { AdminLoginBody } from "@workspace/api-zod";
import {
  authenticate,
  clearAuthCookie,
  readUserFromRequest,
  setAuthCookie,
  signToken,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req: any, res: any) => {
  const body = AdminLoginBody.parse(req.body);
  const user = await authenticate(body.username, body.password);
  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user });
});

router.get("/auth/me", (req: any, res: any) => {
  const user = readUserFromRequest(req);
  res.json({ user: user ?? null });
});

router.post("/auth/logout", (_req: any, res: any) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
