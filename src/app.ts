import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./errors";
import { eventsRouter } from "./routes/events";
import { meRouter } from "./routes/me";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    const configuredOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
    const allowedOrigins = new Set([configuredOrigin, "http://localhost:3000"]);
    if (!origin || allowedOrigins.has(origin)) callback(null, true);
    else callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86_400,
}));
app.use(express.json({ limit: "64kb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "shomaj-api", database: process.env.MONGODB_DB_NAME ?? "shomaj" });
});

app.use("/api/events", eventsRouter);
app.use("/api/me", meRouter);

app.use(notFoundHandler);
app.use(errorHandler);
