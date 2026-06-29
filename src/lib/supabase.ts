import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e`;

export async function portalFetch(
  path: string,
  options?: RequestInit,
  accessToken?: string
) {
  const token = accessToken || publicAnonKey;
  console.log("portalFetch: path=", path, "has accessToken:", !!accessToken);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  const data = await res.json();
  console.log("portalFetch: response status=", res.status, "ok=", res.ok);
  if (!res.ok) {
    console.error("portalFetch error:", data.error || "Request failed");
    throw new Error(data.error || "Request failed");
  }
  return data;
}
