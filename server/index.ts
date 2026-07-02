import dotenv from "dotenv";
import { createApp } from "./app";

dotenv.config({ path: ".env.local" });
dotenv.config();

const PORT = parseInt(process.env.API_PORT || "4000", 10);
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`[Agro Olam API] Express server: http://localhost:${PORT}`);
  console.log(`[Agro Olam API] POST /api/ai/agronom`);
  console.log(`[Agro Olam API] Model: ${process.env.OPENAI_MODEL || "gpt-5.4-mini"}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[Agro Olam API] Port ${PORT} band. Boshqa terminalni yoping yoki API_PORT o'zgartiring.`
    );
    process.exit(1);
  }
  throw err;
});
