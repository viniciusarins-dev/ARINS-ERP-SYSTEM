import type { NextFunction, Request, Response } from "express";

import { getCurrentOrganization, type CurrentOrganization } from "../lib/organizations.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      organization: CurrentOrganization;
    }
  }
}

/** Must run after requireAuth. Rejects with 404 if the user has no organization yet. */
export async function requireOrganization(req: Request, res: Response, next: NextFunction) {
  const organization = await getCurrentOrganization(req.supabase);

  if (!organization) {
    res.status(404).json({ error: "no_organization", message: "Nenhuma organizacao ativa" });
    return;
  }

  req.organization = organization;
  next();
}
