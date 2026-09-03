// Supabase's auth client parses tokens out of URLs, which needs a WHATWG URL
// implementation React Native does not ship. Must be imported before the client.
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Same Supabase project as the website. These are the public anon credentials
 * (mirrored from utils/supabase/info.tsx in the web project) — every permission
 * check happens server-side in the edge function against the caller's JWT, so
 * shipping them in the bundle is expected, not a leak.
 */
export const PROJECT_ID = "uunwhesmymkwmkgqkmxy";
export const PUBLIC_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bndoZXNteW1rd21rZ3FrbXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzM2NDgsImV4cCI6MjA5MzE0OTY0OH0.SYNvg1GoJeU6hgORwS9sTbNqNCjqHrHbxdyUC4uNAOQ";

export const API_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/make-server-0951c59e`;

export const supabase = createClient(`https://${PROJECT_ID}.supabase.co`, PUBLIC_ANON_KEY, {
  auth: {
    // AsyncStorage rather than the web default (localStorage, which does not
    // exist here). This is what keeps you signed in between app launches.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL to read a session out of in a native app.
    detectSessionInUrl: false,
  },
});

/**
 * Calls the admin edge function. Mirrors `portalFetch` on the web so both
 * clients speak to the endpoints the same way.
 */
export async function apiFetch(path: string, options: RequestInit = {}, accessToken?: string) {
  const token = accessToken || PUBLIC_ANON_KEY;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // A non-JSON body means the function crashed or a proxy answered instead;
    // surfacing the raw text beats "Unexpected token < in JSON".
    throw new Error(res.ok ? "Onverwacht antwoord van de server" : text.slice(0, 200));
  }

  if (!res.ok) {
    const message = (data as { error?: string })?.error;
    throw new Error(message || `Verzoek mislukt (${res.status})`);
  }
  return data;
}
