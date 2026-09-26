import { Hono } from "npm:hono";
import * as kv from "../kv_store.tsx";
import { verifyAdmin } from "../lib/auth.ts";
import { clientToApi, type ClientRow } from "../lib/clients.ts";
import { EMAIL_ADMIN_NOTIFY, EMAIL_RE, INVITE_VALID_DAYS, SITE_URL } from "../lib/config.ts";
import { db, found, must } from "../lib/db.ts";
import { emailWrap, escapeHtml, sendEmail } from "../lib/email.ts";
import { type Env, fail, readBody, requireAdmin, text, z } from "../lib/http.ts";
import { notify } from "../lib/notify.ts";
import { passwordProblem } from "../lib/passwords.ts";
import { gallerySigner, loadProjects, projectToApi } from "../lib/projects.ts";
import { removePrivate } from "../lib/storage.ts";
import { randomToken } from "../lib/util.ts";

const r = new Hono<Env>();
export default r;

/** Finds the client with this email or makes one; used when inviting. */
async function upsertClientByEmail(email: string, name: string): Promise<ClientRow> {
  const existing = must(await db.from("clients").select("*").ilike("email", email).maybeSingle()) as ClientRow | null;
  if (existing) {
    if (name && !existing.name) {
      return must(await db.from("clients").update({ name }).eq("id", existing.id).select("*").single()) as ClientRow;
    }
    return existing;
  }
  return must(await db.from("clients").insert({ email, name }).select("*").single()) as ClientRow;
}

/** After sign-up: attach the new login to the invited client record. */
async function linkSignedUpClient(userId: string, email: string, invite: any, name: string, company: string) {
  const byId = invite?.clientId
    ? must(await db.from("clients").select("id").eq("id", invite.clientId).maybeSingle()) as { id: string } | null
    : null;
  const target = byId || must(await db.from("clients").select("id").ilike("email", email).maybeSingle()) as { id: string } | null;
  if (target) {
    must(await db.from("clients").update({ user_id: userId, ...(name ? { name } : {}), ...(company ? { company } : {}) }).eq("id", target.id));
  } else {
    must(await db.from("clients").insert({ id: userId, user_id: userId, email, name: name || email, company: company || "" }));
  }
}

// --- POST /portal/signup ---
r.post("/make-server-0951c59e/portal/signup", async (c) => {
  try {
    const { email, password, name, company, token } = await c.req.json();

    // An account is made for someone we invited, not for whoever finds this
    // address. Without a standing invitation there is nothing to activate, and
    // the token from the email proves the link was actually received.
    const inviteEmail = String(email || "").trim().toLowerCase();
    const inviteStr = await kv.get(`portal:invite:${inviteEmail}`);
    const invite = inviteStr ? JSON.parse(inviteStr) : null;
    if (!invite || invite.usedAt || !invite.token || invite.token !== String(token || "")) {
      return c.json(
        { error: "Voor dit e-mailadres staat geen uitnodiging klaar. Vraag PhotoDeCaffeine om een uitnodiging." },
        403
      );
    }
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      return c.json(
        { error: "Deze uitnodiging is verlopen. Vraag PhotoDeCaffeine om een nieuwe." },
        403
      );
    }

    const pwProblem = await passwordProblem(password);
    if (pwProblem) return c.json({ error: pwProblem }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use REST API directly to avoid SDK version parsing issues
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        email,
        password,
        user_metadata: { name: name || email, company: company || "" },
        email_confirm: true,
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      console.log("Signup error:", JSON.stringify(createData));
      return c.json({ error: createData.message || createData.msg || "Signup failed" }, 400);
    }

    const userId = createData.id;

    // The client record made at invite time gets this login attached.
    await linkSignedUpClient(userId, inviteEmail, invite, name, company);

    // Spent — an invitation makes one account, not a supply of them.
    await kv.set(
      `portal:invite:${inviteEmail}`,
      JSON.stringify({ ...invite, usedAt: new Date().toISOString(), userId })
    );

    // Notify admin of the new signup
    await sendEmail({
      to: EMAIL_ADMIN_NOTIFY,
      subject: `Nieuwe klantaccount — ${name || email}`,
      html: emailWrap(`
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Nieuwe Klant</span>
            <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">${escapeHtml(name || email)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);width:88px;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">E-mail</td>
                <td style="padding:9px 0;border-bottom:1px solid rgba(255,251,224,0.06);color:#fffbe0;font-size:13px;">${escapeHtml(email)}</td>
              </tr>
              ${company ? `<tr><td style="padding:9px 0;color:rgba(255,251,224,0.3);font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;vertical-align:top;">Bedrijf</td><td style="padding:9px 0;color:#fffbe0;font-size:13px;">${escapeHtml(company)}</td></tr>` : ""}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 36px;">
            <a href="${SITE_URL}/admin/clients" style="display:inline-block;background-color:#fffbe0;color:#1a0c04;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 26px;">Bekijk klanten</a>
          </td>
        </tr>
      `),
    });

    await notify({
      type: "client",
      title: `Nieuwe klant: ${name || email}`,
      body: company ? `${company} — ${email}` : email,
      link: "/admin/clients",
    });

    return c.json({ success: true });
  } catch (err) {
    console.log("Signup unexpected error:", err);
    return c.json({ error: `Internal server error during signup: ${err}` }, 500);
  }
});

// --- POST /admin/clients/invite — email a portal invitation to a new client ---
// Only the address is required. The invite links to the portal with the email
// prefilled on the sign-up tab, so the client picks their own password; no
// account is created here.
r.post("/make-server-0951c59e/admin/clients/invite", async (c) => {
  try {
    const admin = await verifyAdmin(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();

    if (!EMAIL_RE.test(email)) {
      return c.json({ error: "Vul een geldig e-mailadres in." }, 400);
    }

    // An invite to someone who already has an account only causes confusion —
    // the sign-up form would reject them.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lookupRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50&filter=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
    );
    if (lookupRes.ok) {
      const lookupData = await lookupRes.json().catch(() => ({}));
      const exists = (lookupData.users || []).some(
        (u: any) => String(u.email || "").toLowerCase() === email
      );
      if (exists) {
        return c.json({ error: "Er bestaat al een account met dit e-mailadres." }, 409);
      }
    }

    const client = await upsertClientByEmail(email, name);
    const inviteToken = randomToken();
    const inviteLink = `${SITE_URL}/portal/login?invite=${encodeURIComponent(email)}&token=${inviteToken}`;
    const greeting = name ? `Hallo ${escapeHtml(name.split(" ")[0])},` : "Hallo,";

    const sent = await sendEmail({
      to: email,
      subject: "Je bent uitgenodigd voor het PhotoDeCaffeine klantenportaal",
      replyTo: EMAIL_ADMIN_NOTIFY,
      html: emailWrap(`
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="color:#c8905a;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">Uitnodiging</span>
            <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
            <span style="display:block;color:#fffbe0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">Je klantenportaal staat klaar</span>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 36px 0;">
            <span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">${greeting} we hebben een plek voor je klaargezet in het PhotoDeCaffeine klantenportaal. Daar volg je je projecten, bekijk je je galerijen en download je je foto&#39;s.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 36px 0;">
            <span style="color:rgba(255,251,224,0.55);font-size:14px;font-weight:300;line-height:1.75;">Maak je account aan met dit e-mailadres &mdash; <span style="color:#fffbe0;">${escapeHtml(email)}</span> &mdash; en kies zelf een wachtwoord.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 36px 40px;">
            <a href="${inviteLink}" style="display:inline-block;background-color:#c8905a;color:#0d0703;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:13px 30px;">Account aanmaken</a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px 28px;border-top:1px solid rgba(255,251,224,0.06);">
            <span style="color:rgba(255,251,224,0.2);font-size:11px;">Werkt de knop niet? Kopieer deze link in je browser: ${inviteLink}. Vragen? Antwoord gerust op deze mail.</span>
          </td>
        </tr>
      `),
    });

    if (!sent.ok) {
      return c.json({ error: sent.error || "De uitnodiging kon niet verstuurd worden." }, 502);
    }

    // The record is what opens the sign-up form for this address. Re-inviting
    // overwrites it, so the clock starts again with every new invitation.
    await kv.set(
      `portal:invite:${email}`,
      JSON.stringify({
        email,
        name,
        token: inviteToken,
        clientId: client.id,
        invitedBy: { id: admin.id, name: admin.user_metadata?.name || admin.email },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + INVITE_VALID_DAYS * 86400000).toISOString(),
        usedAt: "",
      })
    );

    return c.json({ success: true, email, clientId: client.id });
  } catch (err) {
    console.log("Admin invite client error:", err);
    return c.json({ error: `Uitnodiging versturen mislukt: ${err}` }, 500);
  }
});

// ---------------------------------------------------------------------------
// Client records
// ---------------------------------------------------------------------------

const A = "/make-server-0951c59e/admin";
r.use(`${A}/clients`, requireAdmin);
r.use(`${A}/client/*`, requireAdmin);
r.use(`${A}/client`, requireAdmin);

/** Last sign-in per login, for the client list. One call covers everyone. */
async function lastSignIns(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users || []) if (u.last_sign_in_at) out.set(u.id, u.last_sign_in_at);
  return out;
}

r.get(`${A}/clients`, async (c) => {
  const rows = must(await db.from("clients").select("*, project_clients ( project_id )").order("created_at", { ascending: false })) || [];
  const signIns = await lastSignIns();
  return c.json({
    clients: rows.map((row: any) =>
      clientToApi(row, {
        projectCount: (row.project_clients || []).length,
        lastSignIn: row.user_id ? signIns.get(row.user_id) || null : null,
      })
    ),
  });
});

const clientSchema = z.object({
  name: text(200).min(1, "Vul een naam in."),
  email: z.string().trim().toLowerCase().refine((v) => v === "" || EMAIL_RE.test(v), "Vul een geldig e-mailadres in.").default(""),
  company: text(200).default(""),
  phone: text(50).default(""),
  notes: text(10000).default(""),
});

r.post(`${A}/client`, async (c) => {
  const b = await readBody(c, clientSchema);
  if (b.email) {
    const dup = must(await db.from("clients").select("id").ilike("email", b.email).maybeSingle());
    if (dup) fail(409, "Er bestaat al een klant met dit e-mailadres.");
  }
  const row = must(await db.from("clients").insert(b).select("*").single()) as ClientRow;
  return c.json({ client: clientToApi(row) });
});

r.get(`${A}/client/:id`, async (c) => {
  const id = c.req.param("id");
  const row = found(await db.from("clients").select("*").eq("id", id).maybeSingle(), "Klant niet gevonden") as ClientRow;
  const links = must(await db.from("project_clients").select("project_id").eq("client_id", id)) || [];
  const projects = await loadProjects({ ids: links.map((l: any) => l.project_id) });
  const sign = await gallerySigner(projects);
  const [quotes, invoices, inquiries] = await Promise.all([
    db.from("quotes").select("id, number, title, status, sent_at, created_at").eq("client_id", id).order("created_at", { ascending: false }),
    db.from("invoices").select("id, number, status, due_on, lines, vat_basis, vat_rate, created_at").eq("client_id", id).order("created_at", { ascending: false }),
    db.from("inquiries").select("id, message, created_at").eq("client_id", id).order("created_at", { ascending: false }),
  ]);
  const signIns = row.user_id ? await lastSignIns() : new Map();
  return c.json({
    client: clientToApi(row, { lastSignIn: row.user_id ? signIns.get(row.user_id) || null : null }),
    projects: projects.map((p) => projectToApi(p, sign)),
    quotes: must(quotes) || [],
    invoices: must(invoices) || [],
    inquiries: must(inquiries) || [],
  });
});

r.put(`${A}/client/:id`, async (c) => {
  const id = c.req.param("id");
  const b = await readBody(c, clientSchema.partial());
  if (b.email) {
    const dup = must(await db.from("clients").select("id").ilike("email", b.email).neq("id", id).maybeSingle());
    if (dup) fail(409, "Er bestaat al een klant met dit e-mailadres.");
  }
  const row = found(await db.from("clients").update(b).eq("id", id).select("*").maybeSingle(), "Klant niet gevonden") as ClientRow;
  // The portal shows the name from the login; keep it in step.
  if (row.user_id && (b.name !== undefined || b.company !== undefined)) {
    await db.auth.admin.updateUserById(row.user_id, { user_metadata: { name: row.name, company: row.company } });
  }
  return c.json({ client: clientToApi(row) });
});

// Removes the client, their login, and every project that belonged to them
// alone. Projects shared with another client stay, without this client.
r.delete(`${A}/client/:id`, async (c) => {
  const id = c.req.param("id");
  const row = found(await db.from("clients").select("*").eq("id", id).maybeSingle(), "Klant niet gevonden") as ClientRow;
  const links = must(await db.from("project_clients").select("project_id, projects ( project_clients ( client_id ), gallery_images ( storage_path ) )").eq("client_id", id)) || [];
  const soleProjects = links.filter((l: any) => (l.projects?.project_clients || []).length <= 1);
  if (soleProjects.length) {
    await removePrivate(soleProjects.flatMap((l: any) => (l.projects?.gallery_images || []).map((g: any) => g.storage_path)));
    must(await db.from("projects").delete().in("id", soleProjects.map((l: any) => l.project_id)));
  }
  must(await db.from("clients").delete().eq("id", id));
  if (row.user_id) {
    const { error } = await db.auth.admin.deleteUser(row.user_id);
    if (error) console.error("delete login failed:", error.message);
  }
  if (row.email) await kv.del(`portal:invite:${row.email.toLowerCase()}`);
  return c.json({ success: true });
});
