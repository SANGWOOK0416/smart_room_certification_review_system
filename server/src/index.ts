import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";
import { warmupDatabase } from "./db.js";
import { env } from "./env.js";
import { router } from "./routes.js";

const app = express();
const allowedOrigins = new Set([
  env.CLIENT_ORIGIN,
  env.CLIENT_ORIGIN.replace("localhost", "127.0.0.1"),
  env.CLIENT_ORIGIN.replace("127.0.0.1", "localhost"),
  "http://127.0.0.1:4174",
  "http://localhost:4174"
]);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin ${origin}`));
    }
  })
);
app.use(express.json({ limit: "12mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", router);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const field = firstIssue?.path?.join(".");
    const message = firstIssue?.message ?? "입력값을 확인해주세요.";
    return res.status(400).json({
      message: field ? `${field}: ${message}` : message,
      issues: error.issues
    });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return res.status(500).json({ message });
});

async function start() {
  await warmupDatabase();
  app.listen(env.PORT, () => {
    console.log(`Smart room safety API listening on http://localhost:${env.PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
