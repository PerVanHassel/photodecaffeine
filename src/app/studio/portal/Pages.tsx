import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FileText, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../../../lib/supabase";
import { put } from "../api";
import { ago, euro, fmtDate } from "../format";
import { useAction } from "../queries";
import { Button, Card, Empty, ErrorState, Pill, SkeletonList, TextField } from "../ui";
import { pkeys, useMe, usePortalInvoices, usePortalProjects, usePortalQuotes } from "./data";

const QUOTE_LABEL = { sent: { label: "Wacht op jou", tone: "warn" as const }, accepted: { label: "Akkoord", tone: "ok" as const }, declined: { label: "Afgewezen", tone: undefined } };

export function PortalDocuments() {
  const quotes = usePortalQuotes();
  const invoices = usePortalInvoices();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main className="p-main" style={{ maxWidth: 880 }}>
      <div className="p-hello"><h1>Offertes &amp; facturen</h1></div>
      <Card title="Offertes" bodyClass="none">
        {quotes.isLoading ? <SkeletonList rows={2} /> : quotes.isError ? <div className="s-card-body"><ErrorState error={quotes.error} /></div> : !quotes.data?.length ? <Empty icon={<FileText />} title="Nog geen offertes" /> : (
          <ul className="s-list">
            {quotes.data.map((q) => (
              <li key={q.id}>
                <a className="s-item" href={`/offerte/${q.id}?t=${q.token}`}>
                  <span className="s-ico acc"><FileText /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="t s-truncate">{q.title}</div>
                    <div className="s">{q.number} · {euro(q.totals.oneTime)}{q.totals.monthly ? ` + ${euro(q.totals.monthly)} p/m` : ""} · {q.respondedAt ? `beantwoord ${ago(q.respondedAt)}` : `ontvangen ${ago(q.sentAt)}`}</div>
                  </div>
                  <span className="s-row nowrap"><Pill tone={QUOTE_LABEL[q.status].tone}>{QUOTE_LABEL[q.status].label}</Pill><ChevronRight size={15} className="s-faint" /></span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Facturen" bodyClass="none">
        {invoices.isLoading ? <SkeletonList rows={2} /> : invoices.isError ? <div className="s-card-body"><ErrorState error={invoices.error} /></div> : !invoices.data?.length ? <Empty icon={<Receipt />} title="Nog geen facturen" /> : (
          <ul className="s-list">
            {invoices.data.map((i) => {
              const late = i.status === "sent" && i.dueOn < today;
              return (
                <li key={i.id}>
                  <a className="s-item" href={`/factuur/${i.id}?t=${i.token}`}>
                    <span className={`s-ico ${late ? "bad" : i.status === "paid" ? "ok" : ""}`}><Receipt /></span>
                    <div><div className="t">{i.number}</div><div className="s">{euro(i.totals.total)} · {i.status === "paid" ? `betaald ${fmtDate(i.paidAt)}` : `te betalen voor ${fmtDate(i.dueOn)}`}</div></div>
                    <span className="s-row nowrap"><Pill tone={i.status === "paid" ? "ok" : late ? "bad" : "info"}>{i.status === "paid" ? "Betaald" : late ? "Te laat" : i.status === "void" ? "Vervallen" : "Open"}</Pill><ChevronRight size={15} className="s-faint" /></span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </main>
  );
}

export function PortalMessages() {
  const projects = usePortalProjects();
  const list = projects.data?.projects || [];
  return (
    <main className="p-main" style={{ maxWidth: 880 }}>
      <div className="p-hello"><h1>Berichten</h1><p>Elk project heeft een eigen gesprek. Kies er een.</p></div>
      <Card bodyClass="none">
        {projects.isLoading ? <SkeletonList rows={3} /> : !list.length ? <Empty title="Nog geen projecten" /> : (
          <ul className="s-list">
            {list.map((p) => (
              <li key={p.id}>
                <Link className="s-item" to={`/portal/project/${p.id}#berichten`}>
                  <span className={`s-ico ${p.unreadMessages ? "acc" : ""}`}>{p.unreadMessages || "·"}</span>
                  <div><div className="t">{p.title}</div><div className="s">{p.unreadMessages ? `${p.unreadMessages} ongelezen` : "Geen nieuwe berichten"}</div></div>
                  <ChevronRight size={15} className="s-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}

export function PortalAccount() {
  const qc = useQueryClient();
  const me = useMe();
  const [f, setF] = useState({ name: "", company: "", phone: "" });
  const [pw, setPw] = useState({ next: "", repeat: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  useEffect(() => { if (me.data) setF({ name: me.data.name, company: me.data.company, phone: me.data.phone }); }, [me.data]);

  const save = useAction({
    fn: () => put("/portal/me", f),
    invalidate: () => [pkeys.me],
    success: "Gegevens opgeslagen",
    onSuccess: () => { supabase.auth.refreshSession().catch(() => {}); qc.invalidateQueries({ queryKey: pkeys.projects }); },
  });
  const changePw = useAction({
    fn: async () => {
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) throw new Error(error.message.includes("weak") || error.message.includes("pwned") ? "Kies een sterker wachtwoord; dit staat in bekende datalekken of is te kort." : error.message);
    },
    success: "Wachtwoord gewijzigd",
    onSuccess: () => setPw({ next: "", repeat: "" }),
  });

  return (
    <main className="p-main" style={{ maxWidth: 720 }}>
      <div className="p-hello"><h1>Account</h1><p>{me.data?.email}</p></div>
      <Card title="Je gegevens">
        <form className="s-form-grid" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <TextField label="Naam" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
          <TextField label="Bedrijf" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} autoComplete="organization" />
          <TextField label="Telefoon" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
          <div className="full"><Button type="submit" variant="primary" loading={save.isPending} disabled={!f.name.trim()}>Opslaan</Button></div>
        </form>
      </Card>
      <Card title="Wachtwoord wijzigen">
        <form className="s-form-grid" onSubmit={(e) => {
          e.preventDefault();
          if (pw.next.length < 8) return setPwError("Kies minstens 8 tekens.");
          if (pw.next !== pw.repeat) return setPwError("De twee wachtwoorden zijn niet gelijk.");
          setPwError(null);
          changePw.mutate();
        }}>
          <TextField label="Nieuw wachtwoord" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <TextField label="Herhaal" type="password" autoComplete="new-password" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} error={pwError} />
          <div className="full"><Button type="submit" loading={changePw.isPending} disabled={!pw.next}>Wachtwoord wijzigen</Button></div>
        </form>
      </Card>
    </main>
  );
}
