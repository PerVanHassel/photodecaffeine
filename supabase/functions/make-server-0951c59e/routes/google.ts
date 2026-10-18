import { Hono } from "npm:hono";
import { SITE_URL } from "../lib/config.ts";
import {
  authUrl, exchangeCode, findLocation, forgetConnection, googleClient, googleConnection, saveConnection, saveGoogleClient,
} from "../lib/google.ts";
import { type Env, fail, nameOf, readBody, requireAdmin, requirePermission, z } from "../lib/http.ts";
import { syncGoogle } from "../lib/reviews.ts";

const r = new Hono<Env>();
export default r;

// Whoever looks after the reviews looks after the connection that brings them in.
r.use("/make-server-0951c59e/admin/google", requireAdmin, requirePermission("managePortfolio", "reviews"));
r.use("/make-server-0951c59e/admin/google/*", requireAdmin, requirePermission("managePortfolio", "reviews"));

// Google sends the owner back to this admin page, which hands the code to
// /admin/google/connect. The function itself cannot be the landing page: it
// only answers requests that carry a Supabase key.
const CALLBACK_PATH = "/admin/reviews/google";

function allowedRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.pathname === CALLBACK_PATH &&
      (u.origin === SITE_URL || u.origin === "https://photodecaffeine.com" || /^http:\/\/localhost(:\d+)?$/.test(u.origin));
  } catch {
    return false;
  }
}

async function status() {
  const [client, conn] = await Promise.all([googleClient(), googleConnection()]);
  return {
    configured: !!client,
    clientId: client?.clientId || "",
    // Set as function secrets, the client cannot be changed from the admin.
    fromEnv: !!Deno.env.get("GOOGLE_CLIENT_ID"),
    callbackUrl: SITE_URL + CALLBACK_PATH,
    connected: !!conn,
    email: conn?.email || "",
    title: conn?.title || "",
    mapsUrl: conn?.mapsUrl || "",
    reviewUrl: conn?.reviewUrl || "",
    rating: conn?.rating || 0,
    count: conn?.count || 0,
    lastSyncAt: conn?.lastSyncAt || null,
    lastError: conn?.lastError || "",
  };
}

r.get("/make-server-0951c59e/admin/google", async (c) => c.json(await status()));

r.put("/make-server-0951c59e/admin/google/client", async (c) => {
  if (Deno.env.get("GOOGLE_CLIENT_ID")) fail(400, "De client staat vast in de functie-instellingen.");
  const body = await readBody(c, z.object({
    clientId: z.string().trim().regex(/^[\w-]+\.apps\.googleusercontent\.com$/, "Een client-ID eindigt op .apps.googleusercontent.com."),
    clientSecret: z.string().trim().min(10, "Plak het hele clientgeheim."),
  }));
  await saveGoogleClient(body);
  return c.json(await status());
});

r.post("/make-server-0951c59e/admin/google/start", async (c) => {
  const { redirectUri } = await readBody(c, z.object({ redirectUri: z.string() }));
  if (!allowedRedirect(redirectUri)) fail(400, "Koppelen kan alleen vanaf de eigen site.");
  const client = await googleClient();
  if (!client) fail(400, "Vul eerst de client-ID en het geheim in.");
  return c.json({ url: await authUrl(client, redirectUri, c.get("user").id) });
});

r.post("/make-server-0951c59e/admin/google/connect", async (c) => {
  const { code, state } = await readBody(c, z.object({ code: z.string().min(1), state: z.string().min(1) }));
  const client = await googleClient();
  if (!client) fail(400, "Vul eerst de client-ID en het geheim in.");
  const admin = c.get("user");
  const { refreshToken, email } = await exchangeCode(client, code, state, admin.id);
  const location = await findLocation({ refreshToken });
  await saveConnection({ refreshToken, email, ...location, connectedAt: new Date().toISOString(), connectedBy: nameOf(admin) });
  // Connected either way; a failed first round shows up as the last error.
  const synced = await syncGoogle().catch(() => null);
  return c.json({ ...(await status()), synced });
});

r.post("/make-server-0951c59e/admin/google/sync", async (c) => {
  const result = await syncGoogle();
  return c.json({ ...(await status()), synced: result });
});

r.delete("/make-server-0951c59e/admin/google", async (c) => {
  await forgetConnection();
  return c.json(await status());
});
