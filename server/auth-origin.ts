import type { Request, Response, NextFunction } from "express";
// Reject cross-origin state-changing requests, including protected SRS/offline mutations.
export function enforceSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const origin = req.headers.origin, host = req.headers.host;
  try {
    if (typeof origin !== "string" || typeof host !== "string") throw Error("missing origin");
    const url = new URL(origin);
    if (url.host !== host || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw Error("origin mismatch");
  } catch { res.status(403).json({ error: "Forbidden origin" }); return; }
  next();
}
