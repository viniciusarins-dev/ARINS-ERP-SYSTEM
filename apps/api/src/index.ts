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

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/organizations", requireAuth, organizationsRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/products", requireAuth, productsRouter);
app.use("/api/customers", requireAuth, customersRouter);
app.use("/api/sales", requireAuth, salesRouter);

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
