import * as kv from "../kv_store.tsx";
import { EMAIL_ADMIN_NOTIFY } from "./config.ts";

/** The studio's own details, printed on every invoice and quote; kept with the site settings. */
export async function business() {
  const raw = await kv.get("site:settings");
  // Stored as JSON text, sometimes twice over; older rows are an object.
  let s: any = raw ?? {};
  while (typeof s === "string") s = JSON.parse(s);
  return {
    name: s.business?.name || "PhotoDeCaffeine Productions",
    address: s.business?.address || "",
    kvk: s.business?.kvk || "",
    vatNumber: s.business?.vatNumber || "",
    iban: s.business?.iban || "",
    email: s.business?.email || EMAIL_ADMIN_NOTIFY,
  };
}
