import express from "express";
import helmet from "helmet";
import agronomRouter from "./routes/agronom";
import { corsMiddleware, securityHeaders } from "./middleware/security";

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "32kb" }));

  app.use("/api/ai", agronomRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Endpoint topilmadi." });
  });

  return app;
}
