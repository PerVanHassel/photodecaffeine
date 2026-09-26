import { projectId, publicAnonKey } from "/utils/supabase/info";
import { supabase } from "../../lib/supabase";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e`;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
  /** Send the anon key instead of the session (public routes). */
  anonymous?: boolean;
};

/**
 * Calls the edge function with the signed-in session. Errors carry the
 * server's own message, which is written for the person using the screen.
 */
export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  // Dev-server only: answer from local fixtures (see dev/mock.ts).
  if (import.meta.env.DEV && typeof localStorage !== "undefined" && localStorage.getItem("pdc-mock") === "1") {
    const { mockApi } = await import("./dev/mock");
    return (await mockApi(path, opts.method || (opts.body !== undefined || opts.form ? "POST" : "GET"), opts.body)) as T;
  }
  const token = opts.anonymous ? null : await accessToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token || publicAnonKey}` };
  if (!opts.form && opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method || (opts.body !== undefined || opts.form ? "POST" : "GET"),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "Geen verbinding met de server. Controleer je internet en probeer het opnieuw.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      window.dispatchEvent(new CustomEvent("pdc:session-expired"));
      throw new ApiError(401, "Je sessie is verlopen. Log opnieuw in.");
    }
    throw new ApiError(res.status, (data as { error?: string }).error || `Er ging iets mis (${res.status}).`);
  }
  return data as T;
}

export const get = <T,>(path: string, signal?: AbortSignal) => api<T>(path, { signal });
export const post = <T,>(path: string, body: unknown = {}) => api<T>(path, { method: "POST", body });
export const put = <T,>(path: string, body: unknown) => api<T>(path, { method: "PUT", body });
export const del = <T,>(path: string) => api<T>(path, { method: "DELETE" });

export function upload<T>(path: string, files: File[], field = "files"): Promise<T> {
  const form = new FormData();
  for (const f of files) form.append(field, f);
  return api<T>(path, { method: "POST", form });
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Er ging iets mis.";
}
