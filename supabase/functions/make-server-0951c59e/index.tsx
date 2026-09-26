import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { onError } from "./lib/http.ts";

import clients from "./routes/clients.ts";
import declarations from "./routes/declarations.ts";
import engagement from "./routes/engagement.ts";
import events from "./routes/events.ts";
import inquiries from "./routes/inquiries.ts";
import invoices from "./routes/invoices.ts";
import locations from "./routes/locations.ts";
import notifications from "./routes/notifications.ts";
import overview from "./routes/overview.ts";
import portal from "./routes/portal.ts";
import portfolio from "./routes/portfolio.ts";
import projects from "./routes/projects.ts";
import quotes from "./routes/quotes.ts";
import settings from "./routes/settings.ts";
import storage from "./routes/storage.ts";
import tasks from "./routes/tasks.ts";
import team from "./routes/team.ts";

// One edge function serves the site, the portal and the admin. Every module
// registers its own full paths (/make-server-0951c59e/...), so they are all
// mounted at the root. Studio data lives in Postgres; public site content
// (portfolio, settings, reviews, declarations, roles, notifications) in the
// kv store.
const app = new Hono<any>();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);
app.onError(onError);

const modules: Hono<any>[] = [
  clients, portal, projects, quotes, invoices, inquiries, tasks, locations, events, overview,
  engagement, portfolio, team, declarations, settings, notifications, storage,
];
for (const module of modules) app.route("/", module);

Deno.serve(app.fetch);
