import { Router, type Request, type Response } from "express";
import {
  generateAgronomAnswer,
  streamAgronomAnswer,
  type AgronomRequest,
} from "../services/agronomService";
import { validateAgronomRequest } from "../middleware/validate";
import { agronomRateLimiter } from "../middleware/rateLimit";

const router = Router();

const ERROR_MESSAGE =
  "Kechirasiz, hozir javob berishda muammo bo'ldi. Iltimos, qayta urinib ko'ring.";

function wantsStream(req: Request): boolean {
  return (
    req.query.stream === "true" ||
    req.headers.accept === "text/event-stream"
  );
}

router.post(
  "/agronom",
  agronomRateLimiter,
  validateAgronomRequest,
  async (req: Request, res: Response) => {
    const body = req.body as AgronomRequest;

    try {
      if (wantsStream(req)) {
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();

        let fullAnswer = "";

        for await (const chunk of streamAgronomAnswer(body)) {
          fullAnswer += chunk;
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true, answer: fullAnswer })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      const answer = await generateAgronomAnswer(body);
      res.json({ answer });
    } catch (error) {
      console.error("[agronom] Error:", error);

      if (res.headersSent) {
        res.write(
          `data: ${JSON.stringify({ error: ERROR_MESSAGE })}\n\n`
        );
        res.end();
        return;
      }

      const isConfigError =
        error instanceof Error &&
        error.message.includes("OPENAI_API_KEY");

      res.status(isConfigError ? 503 : 500).json({
        error: ERROR_MESSAGE,
      });
    }
  }
);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "agro-olam-ai-agronom" });
});

export default router;
