import type { Context, MiddlewareHandler } from "npm:hono";
import { z } from "npm:zod@3";
import { hasPermission, verifyAdmin, verifyAuth } from "./auth.ts";

export { z };

/** Variables the auth middleware puts on the context. */
export type Env = { Variables: { user: any } };

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}

/** Parses the JSON body against a schema; the first problem becomes a 400. */
export async function readBody<T extends z.ZodTypeAny>(c: Context, schema: T): Promise<z.infer<T>> {
  const raw = await c.req.json().catch(() => ({}));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path?.length ? `${issue.path.join(".")}: ` : "";
    fail(400, `${where}${issue?.message || "Ongeldige invoer."}`);
  }
  return parsed.data;
}

/** Hono onError: known errors keep their status and text, the rest is a plain 500. */
export function onError(err: Error, c: Context) {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status as any);
  console.error("unhandled:", err);
  return c.json({ error: "Er ging iets mis op de server. Probeer het opnieuw." }, 500);
}

export const requireAdmin: MiddlewareHandler<Env> = async (c, next) => {
  const user = await verifyAdmin(c.req.header("Authorization") ?? null);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", user);
  await next();
};

export const requireUser: MiddlewareHandler<Env> = async (c, next) => {
  const user = await verifyAuth(c.req.header("Authorization") ?? null);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", user);
  await next();
};

// Shared field shapes.
export const uuid = z.string().uuid("Ongeldige id.");
export const isoDateTime = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Ongeldige datum.");
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Gebruik een datum als 2026-09-27.");
export const text = (max = 2000) => z.string().trim().max(max, `Maximaal ${max} tekens.`);

/** Display name of whoever is signed in. */
export function nameOf(user: any): string {
  return user?.user_metadata?.name || user?.email || "PDC Studio";
}

/**
 * After requireAdmin: the signed-in admin's role must grant `permission`.
 * The owner always passes (see hasPermission).
 */
export function requirePermission(permission: string, what: string): MiddlewareHandler<Env> {
  return async (c, next) => {
    if (!(await hasPermission(c.get("user"), permission))) {
      return c.json({ error: `Je rol geeft geen toegang tot ${what}. Vraag de eigenaar om dit aan te zetten bij Team & rollen.` }, 403);
    }
    await next();
  };
}
