import { Router, type IRouter } from "express";
import { ChatbotMessageBody } from "@workspace/api-zod";
import { handleChatbotTurn } from "../lib/chatbot";

const router: IRouter = Router();

router.post("/chatbot/message", async (req, res) => {
  const body = ChatbotMessageBody.parse(req.body);
  const result = await handleChatbotTurn(body.message, body.state);
  res.json(result);
});

export default router;
