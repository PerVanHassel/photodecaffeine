// The site's own visitor statistics (src/app/lib/analytics.ts) go out with
// sendBeacon, which cannot send the API key the Supabase function gateway
// requires. This forwards each batch with the public anon key; the edge
// function (routes/analytics.ts) checks and stores it. Being on the site's own
// address also means no CORS, and no third-party host for blockers to match.
// Same public values as utils/supabase/info.tsx; copied because the function
// bundler does not compile the app's .tsx sources.
const projectId = "uunwhesmymkwmkgqkmxy";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bndoZXNteW1rd21rZ3FrbXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzM2NDgsImV4cCI6MjA5MzE0OTY0OH0.SYNvg1GoJeU6hgORwS9sTbNqNCjqHrHbxdyUC4uNAOQ";

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  // A batch is a few kilobytes; anything far bigger is not from the site.
  if (body && body.length <= 64_000) {
    await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/v`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey,
        "Content-Type": "text/plain",
        // The function leaves out bots by their user agent.
        "User-Agent": request.headers.get("user-agent") || "",
      },
      body,
    }).catch(() => {});
  }
  return new Response(null, { status: 204 });
}
