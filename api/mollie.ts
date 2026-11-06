// Mollie posts the id of a payment here whenever it changes (the webhookUrl
// that routes/payments.ts gives every payment). Mollie cannot send the API key
// the Supabase function gateway requires, so this forwards the post with the
// public anon key. Nothing in it is trusted: the edge function asks Mollie
// itself what happened. Mollie wants a 200; anything else and it tries again
// later, which is what should happen when the function failed.
// Same public values as utils/supabase/info.tsx; copied because the function
// bundler does not compile the app's .tsx sources.
const projectId = "uunwhesmymkwmkgqkmxy";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bndoZXNteW1rd21rZ3FrbXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzM2NDgsImV4cCI6MjA5MzE0OTY0OH0.SYNvg1GoJeU6hgORwS9sTbNqNCjqHrHbxdyUC4uNAOQ";

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  // "id=tr_…" and nothing else; anything far bigger is not from Mollie.
  if (!body || body.length > 2_000) return new Response(null, { status: 400 });
  const upstream = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/mollie/webhook`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  }).catch(() => null);
  return new Response(null, { status: upstream?.ok ? 200 : 502 });
}
