import * as kv from "../kv_store.tsx";

export const NOTIFICATION_LIMIT = 100;

/**
 * Adds a notification. Never throws and never blocks the caller's own work —
 * a failed melding must not fail the message, signup or enquiry that caused it.
 */
export async function notify(n: {
  type: "message" | "client" | "inquiry" | "review" | "feedback" | "quote" | "invoice" | "favorites";
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  try {
    const raw = await kv.get("notifications:items");
    const items = raw ? JSON.parse(raw) : [];
    items.unshift({
      id: crypto.randomUUID(),
      type: n.type,
      title: String(n.title || "").slice(0, 160),
      body: String(n.body || "").replace(/\s+/g, " ").trim().slice(0, 240),
      link: n.link || "",
      createdAt: new Date().toISOString(),
    });
    await kv.set("notifications:items", JSON.stringify(items.slice(0, NOTIFICATION_LIMIT)));
  } catch (err) {
    console.log("notify failed:", err);
  }
}

export async function notificationItems(): Promise<any[]> {
  const raw = await kv.get("notifications:items");
  return raw ? JSON.parse(raw) : [];
}
