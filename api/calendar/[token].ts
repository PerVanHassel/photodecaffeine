// Calendar apps poll this URL to show the studio's shoots and meetings. They
// cannot send the API key the Supabase function gateway requires, so this
// forwards the request with the public anon key. The token in the URL is what
// actually grants access; the edge function checks it.
// Same public values as utils/supabase/info.tsx; copied because the function
// bundler does not compile the app's .tsx sources.
const projectId = "uunwhesmymkwmkgqkmxy";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bndoZXNteW1rd21rZ3FrbXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzM2NDgsImV4cCI6MjA5MzE0OTY0OH0.SYNvg1GoJeU6hgORwS9sTbNqNCjqHrHbxdyUC4uNAOQ";

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).pathname.split("/").pop()?.replace(/\.ics$/, "") || "";
  if (!/^[0-9a-f]{48}$/.test(token)) return new Response("Not found", { status: 404 });

  const upstream = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e/calendar/${token}`,
    { headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey } },
  );
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
