import type { Request, Response, NextFunction } from "express";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 20;

export interface AgronomBody {
  message?: unknown;
  history?: unknown;
}

export function validateAgronomRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body as AgronomBody;

  if (!body.message || typeof body.message !== "string") {
    res.status(400).json({ error: "message maydoni majburiy va matn bo'lishi kerak." });
    return;
  }

  const trimmed = body.message.trim();

  if (!trimmed) {
    res.status(400).json({ error: "message bo'sh bo'lmasligi kerak." });
    return;
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({
      error: `message ${MAX_MESSAGE_LENGTH} belgidan oshmasligi kerak.`,
    });
    return;
  }

  if (body.history !== undefined) {
    if (!Array.isArray(body.history)) {
      res.status(400).json({ error: "history massiv bo'lishi kerak." });
      return;
    }

    if (body.history.length > MAX_HISTORY_LENGTH) {
      res.status(400).json({
        error: `history ${MAX_HISTORY_LENGTH} xabardan oshmasligi kerak.`,
      });
      return;
    }

    for (const item of body.history) {
      if (
        !item ||
        typeof item !== "object" ||
        !("role" in item) ||
        !("content" in item) ||
        (item.role !== "user" && item.role !== "assistant") ||
        typeof item.content !== "string"
      ) {
        res.status(400).json({ error: "history formati noto'g'ri." });
        return;
      }
    }
  }

  req.body = {
    message: trimmed,
    history: body.history as AgronomBody["history"],
  };

  next();
}
