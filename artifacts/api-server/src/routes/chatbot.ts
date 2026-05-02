import { Router, type IRouter } from "express";
import { ChatbotMessageBody } from "@workspace/api-zod";
import { handleChatbotTurn } from "../lib/chatbot";

const router: IRouter = Router();

router.post("/chatbot/message", async (req, res) => {
  const body = ChatbotMessageBody.parse(req.body);
  const result = await handleChatbotTurn(
    body.message,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body.state as any,
    body.lang ?? "en",
  );
  res.json(result);
});

export default router;
