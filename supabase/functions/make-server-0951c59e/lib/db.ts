import { createClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

// One service-role client for the whole function. It bypasses RLS, so every
// route decides for itself who may see what before it queries.
export const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Unwraps a PostgREST result, turning a database error into a 500. */
export function must<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    // A malformed id in the URL ("invalid input syntax for type uuid") is a
    // link to something that does not exist, not a server fault.
    if (res.error.code === "22P02") throw new HttpError(404, "Niet gevonden.");
    console.error("db error:", res.error.code, res.error.message);
    throw new HttpError(500, "De database gaf een fout. Probeer het opnieuw.");
  }
  return res.data as T;
}

/** Like must(), but a missing row is a 404 with the given message. */
export function found<T>(
  res: { data: T | null; error: { message: string; code?: string } | null },
  notFound: string,
): T {
  const data = must(res);
  if (data === null || data === undefined) throw new HttpError(404, notFound);
  return data;
}

export async function nextDocumentNumber(prefix: "OF" | "FA"): Promise<string> {
  return must(await db.rpc("next_document_number", { p_prefix: prefix })) as unknown as string;
}
