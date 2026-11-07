import * as kv from "../kv_store.tsx";
import { db } from "./db.ts";

// What the privacy statement promises about keeping things (part 6, article 6).
// Runs at most once a day, when someone opens the admin's overview. Photos, files,
// invoices and payments that went through are not in here: those stay by hand or
// by law. Payment attempts that never went through go after a year.

const LAST_RUN = "retention:lastRun";
const DAY = 24 * 3600_000;

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

export async function purgeExpiredOncePerDay() {
  try {
    const last = await kv.get(LAST_RUN);
    if (last && Date.now() - new Date(String(last)).getTime() < DAY) return;
    await kv.set(LAST_RUN, new Date().toISOString());
    await Promise.all([
      db.from("site_sessions").delete().lt("started_at", monthsAgo(14)),
      db.from("inquiries").delete().is("client_id", null).is("project_id", null).lt("created_at", monthsAgo(12)),
      db.from("gallery_guests").delete().lt("last_seen_at", monthsAgo(12)),
      db.from("activity_log").delete().lt("created_at", monthsAgo(12)),
      db.from("payments").delete().neq("status", "paid").lt("created_at", monthsAgo(12)),
      // Baskets of photos that were never paid (lib/orders.ts).
      db.from("gallery_orders").delete().is("invoice_id", null).lt("created_at", monthsAgo(12)),
    ]);
  } catch (err) {
    // Cleaning up is never worth failing the admin's first page over; tomorrow it tries again.
    console.log("retention:", err);
  }
}
