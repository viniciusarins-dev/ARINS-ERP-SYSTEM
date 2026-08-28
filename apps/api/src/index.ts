import express, { type ErrorRequestHandler } from "express";
import cors from "cors";

import { env } from "./env.js";
import { requireAuth } from "./middleware/auth.js";
import { organizationsRouter } from "./routes/organizations.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { categoriesRouter } from "./routes/categories.js";
import { productsRouter } from "./routes/products.js";
import { customersRouter } from "./routes/customers.js";
import { salesRouter } from "./routes/sales.js";
import { fiscalRouter } from "./routes/fiscal.js";
import { fiscalWebhookRouter } from "./routes/fiscal-webhook.js";

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Public: authenticated by a secret in the URL itself, not a user session
// (see fiscal-webhook.ts) — must be mounted before express.json() would
// matter only if Focus NFe posts a non-JSON content-type, which they don't,
// so this stays with the rest.
app.use("/api/fiscal/webhooks", fiscalWebhookRouter);

app.use("/api/organizations", requireAuth, organizationsRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/products", requireAuth, productsRouter);
app.use("/api/customers", requireAuth, customersRouter);
app.use("/api/sales", requireAuth, salesRouter);
app.use("/api/fiscal", requireAuth, fiscalRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
};
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`ARINS API listening on :${env.port}`);
});
