import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { activityLog } from "./lib/activity.ts";
import { onError } from "./lib/http.ts";

import account from "./routes/account.ts";
import activity from "./routes/activity.ts";
import analytics from "./routes/analytics.ts";
import clients from "./routes/clients.ts";
import consent from "./routes/consent.ts";
import declarations from "./routes/declarations.ts";
import articleConsent from "./routes/articleConsent.ts";
import documents from "./routes/documents.ts";
import withdrawal from "./routes/withdrawal.ts";
import engagement from "./routes/engagement.ts";
import events from "./routes/events.ts";
import files from "./routes/files.ts";
import google from "./routes/google.ts";
import inquiries from "./routes/inquiries.ts";
import investments from "./routes/investments.ts";
import invoices from "./routes/invoices.ts";
import locations from "./routes/locations.ts";
import notifications from "./routes/notifications.ts";
import overview from "./routes/overview.ts";
import payments from "./routes/payments.ts";
import portal from "./routes/portal.ts";
import portfolio from "./routes/portfolio.ts";
import priority from "./routes/priority.ts";
import projects from "./routes/projects.ts";
import quotes from "./routes/quotes.ts";
import settings from "./routes/settings.ts";
import share from "./routes/share.ts";
import storage from "./routes/storage.ts";
import tasks from "./routes/tasks.ts";
import team from "./routes/team.ts";

// One edge function serves the site, the portal and the admin. Every module
// registers its own full paths (/make-server-0951c59e/...), so they are all
// mounted at the root. Studio data lives in Postgres; public site content
// (portfolio, settings, reviews, declarations, roles, notifications) and the
// Google connection in the kv store.
const app = new Hono<any>();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    // X-View-As: the studio looking along as a client in the portal (lib/clients.ts).
    allowHeaders: ["Content-Type", "Authorization", "X-View-As"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);
app.onError(onError);
// Logboek: every change that succeeded, by anyone, written after the route ran.
app.use("*", activityLog);

const modules: Hono<any>[] = [
  clients, portal, projects, quotes, invoices, payments, inquiries, tasks, locations, events, overview,
  engagement, google, portfolio, team, declarations, investments, documents, files, settings, notifications, storage, share, account, priority, consent, articleConsent, withdrawal, activity, analytics,
];
for (const module of modules) app.route("/", module);

Deno.serve(app.fetch);
