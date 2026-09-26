import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

/**
 * Whether this user may use the admin side. Read from app_metadata, which only
 * the server can set; user_metadata is editable by the user themselves.
 */
export function isAdmin(user: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  return user?.app_metadata?.role === "admin";
}

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e`;

export async function portalFetch(
  path: string,
  options?: RequestInit,
  accessToken?: string
) {
  const token = accessToken || publicAnonKey;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    // A 401 on a call we sent a real token with means that token is no longer
    // good — the session lapsed while the tab sat there. That is not a server
    // failure, and showing it as one sends people looking for a bug that isn't.
    if (res.status === 401 && accessToken) {
      window.dispatchEvent(new CustomEvent("pdc:session-expired"));
      throw new Error("Je sessie is verlopen. Log opnieuw in.");
    }
    throw new Error(data.error || "Request failed");
  }
  return data;
}
