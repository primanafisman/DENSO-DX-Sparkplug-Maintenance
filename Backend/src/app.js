import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { randomUUID, X509Certificate } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { authRoutes } from "./routes/authRoutes.js";
import { authenticate } from "./middleware/authenticate.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { AppError } from "./errors/AppError.js";
import { success } from "./utils/envelope.js";
import { createPhotoService } from "./services/photoService.js";
import { createAnalysisService } from "./services/analysisService.js";
import { photoRoutes } from "./routes/photoRoutes.js";
import { createInstrumentService } from "./services/instrumentService.js";
import { createReadingService } from "./services/readingService.js";
import { instrumentRoutes } from "./routes/instrumentRoutes.js";
import { readingRoutes } from "./routes/readingRoutes.js";
import { createMaintenanceService } from "./services/maintenanceService.js";
import { maintenanceRoutes } from "./routes/maintenanceRoutes.js";
import { reportRoutes } from "./routes/reportRoutes.js";
export function createApp({
  config,
  repositories,
  cvClient,
  clock = () => Date.now(),
  logger,
}) {
  const app = express(),
    revoked = new Map();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    res.set("X-Request-ID", res.locals.requestId);
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          imgSrc: ["'self'", "data:", "blob:"],
          mediaSrc: ["'self'", "blob:"],
          upgradeInsecureRequests:
            config.environment === "production" ? [] : null,
        },
      },
    }),
  );
  app.use((req, res, next) =>
    req.get("Origin") && !config.origins.includes(req.get("Origin"))
      ? next(new AppError(403, "ORIGIN_FORBIDDEN", "Origin not allowed."))
      : next(),
  );
  app.use(cors({ origin: config.origins, credentials: true }));
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());
  const dependencies = {
    config,
    repositories,
    cvClient,
    clock,
    logger,
    revoked,
  };
  const authenticated = authenticate(dependencies);
  app.get("/health", (req, res) =>
    success(res, { status: "up", mode: "LOCAL_CV", version: "1.0.0" }),
  );
  app.get("/ready", async (req, res) => {
    try {
      const health = await cvClient.health();
      const ready =
        health.status === "up" &&
        health.ocr?.weights_present &&
        health.ocr?.initialized;
      return success(
        res,
        {
          database: "verified-at-start",
          engine: health.status,
          ocr_ready: !!ready,
        },
        "Readiness",
        ready ? 200 : 503,
      );
    } catch {
      return success(
        res,
        {
          database: "verified-at-start",
          engine: "unavailable",
          ocr_ready: false,
        },
        "Readiness",
        503,
      );
    }
  });
  const localHttps =
    config.environment !== "production" && !!config.https?.enabled;
  app.get("/api/v1/capabilities", (req, res) => {
    res.set("Cache-Control", "no-store");
    return success(res, {
      mode: "LOCAL_CV",
      demo_reports: config.environment === "development",
      max_upload_bytes: 15 * 1024 * 1024,
      max_image_pixels: 20000000,
      max_items: 12,
      min_roi_pixels: 32,
      max_jobs: config.maxJobs,
      ttl_seconds: config.ttlSeconds,
      local_https: localHttps
        ? {
            enabled: true,
            port: config.https.port,
            ca_download: "/local-camera-ca.cer",
          }
        : { enabled: false },
    });
  });
  if (localHttps)
    app.get("/local-camera-ca.cer", async (req, res) => {
      const certificate = new X509Certificate(
        await fs.readFile(config.https.caFile),
      );
      res
        .set({
          "Cache-Control": "no-store",
          "Content-Type": "application/x-x509-ca-cert",
          "Content-Disposition": 'attachment; filename="camera-ca.cer"',
        })
        .send(certificate.raw);
    });
  app.use("/api/v1/auth", authRoutes(dependencies, authenticated));
  const photos = createPhotoService(dependencies),
    analyses = createAnalysisService(dependencies, photos);
  app.use(
    "/api/v1",
    photoRoutes(dependencies, authenticated, photos, analyses),
  );
  app.locals.services = { photos, analyses };
  const instruments = createInstrumentService(dependencies, photos),
    readings = createReadingService(dependencies, analyses, photos);
  app.use(
    "/api/v1/instruments",
    instrumentRoutes(dependencies, authenticated, instruments),
  );
  app.use(
    "/api/v1/readings",
    readingRoutes(dependencies, authenticated, readings),
  );
  const maintenance = createMaintenanceService(dependencies);
  app.use(
    "/api/v1/maintenance",
    maintenanceRoutes(dependencies, authenticated, maintenance),
  );
  app.use("/api/v1/maintenance", reportRoutes(dependencies, authenticated));
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const frontend = path.resolve(
    config.frontendDir ?? path.join(root, "..", "Frontend", "dist"),
  );
  const hasFrontend = existsSync(path.join(frontend, "index.html"));
  const sendUi = (req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(frontend, "index.html"));
  };
  app.get(
    "/",
    hasFrontend
      ? sendUi
      : (req, res) => {
          res.set("Cache-Control", "no-store");
          res.sendFile(path.join(root, "smoke_ui", "index.html"));
        },
  );
  app.use(
    "/smoke",
    express.static(path.join(root, "smoke_ui"), {
      index: false,
      dotfiles: "deny",
      setHeaders: (res) => res.set("Cache-Control", "no-store"),
    }),
  );
  app.use(
    "/contracts",
    express.static(path.join(root, "contracts"), {
      index: false,
      dotfiles: "deny",
    }),
  );
  if (hasFrontend) {
    app.use(
      express.static(frontend, {
        index: false,
        dotfiles: "deny",
        setHeaders: (res, file) =>
          res.set(
            "Cache-Control",
            /[\\/]assets[\\/][^\\/]+-[A-Za-z0-9_-]+\.[a-z0-9]+$/i.test(file)
              ? "public, max-age=31536000, immutable"
              : "no-store",
          ),
      }),
    );
    app.use((req, res, next) => {
      if (
        ["GET", "HEAD"].includes(req.method) &&
        req.accepts("html") &&
        !/^\/(?:api|contracts|smoke|assets)(?:\/|$)/i.test(req.path) &&
        !path.extname(req.path)
      )
        return sendUi(req, res);
      next();
    });
  }
  app.use((req, res, next) =>
    next(new AppError(404, "NOT_FOUND", "Endpoint not found.")),
  );
  app.use(errorHandler(logger));
  return app;
}
