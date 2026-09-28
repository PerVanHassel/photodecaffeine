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
import { useT } from "./i18n";

const QUOTE_TONE = { sent: "warn" as const, accepted: "ok" as const, declined: undefined };

export function PortalDocuments() {
  const t = useT();
  const quotes = usePortalQuotes();
  const invoices = usePortalInvoices();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main className="p-main" style={{ maxWidth: 880 }}>
      <div className="p-hello"><h1>{t.documentsTitle}</h1></div>
      <Card title={t.quotes} bodyClass="none">
        {quotes.isLoading ? <SkeletonList rows={2} /> : quotes.isError ? <div className="s-card-body"><ErrorState error={quotes.error} /></div> : !quotes.data?.length ? <Empty icon={<FileText />} title={t.noQuotes} /> : (
          <ul className="s-list">
            {quotes.data.map((q) => (
              <li key={q.id}>
                <a className="s-item" href={`/offerte/${q.id}?t=${q.token}`}>
                  <span className="s-ico acc"><FileText /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="t s-truncate">{q.title}</div>
                    <div className="s">{q.number} · {euro(q.totals.oneTime)}{q.totals.monthly ? ` + ${euro(q.totals.monthly)} ${t.perMonth}` : ""} · {q.respondedAt ? t.answered(ago(q.respondedAt)) : t.received(ago(q.sentAt))}</div>
                  </div>
                  <span className="s-row nowrap"><Pill tone={QUOTE_TONE[q.status]}>{t.quoteStatus[q.status]}</Pill><ChevronRight size={15} className="s-faint" /></span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t.invoices} bodyClass="none">
        {invoices.isLoading ? <SkeletonList rows={2} /> : invoices.isError ? <div className="s-card-body"><ErrorState error={invoices.error} /></div> : !invoices.data?.length ? <Empty icon={<Receipt />} title={t.noInvoices} /> : (
          <ul className="s-list">
            {invoices.data.map((i) => {
              const late = i.status === "sent" && i.dueOn < today;
              return (
                <li key={i.id}>
                  <a className="s-item" href={`/factuur/${i.id}?t=${i.token}`}>
                    <span className={`s-ico ${late ? "bad" : i.status === "paid" ? "ok" : ""}`}><Receipt /></span>
                    <div><div className="t">{i.number}</div><div className="s">{euro(i.totals.total)} · {i.status === "paid" ? t.paidOn(fmtDate(i.paidAt)) : t.payBefore(fmtDate(i.dueOn))}</div></div>
                    <span className="s-row nowrap"><Pill tone={i.status === "paid" ? "ok" : late ? "bad" : "info"}>{t.invoiceStatus[i.status === "paid" ? "paid" : late ? "late" : i.status === "void" ? "void" : "open"]}</Pill><ChevronRight size={15} className="s-faint" /></span>
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
  const t = useT();
  const projects = usePortalProjects();
  const list = projects.data?.projects || [];
  return (
    <main className="p-main" style={{ maxWidth: 880 }}>
      <div className="p-hello"><h1>{t.messages}</h1><p>{t.messagesIntro}</p></div>
      <Card bodyClass="none">
        {projects.isLoading ? <SkeletonList rows={3} /> : !list.length ? <Empty title={t.noProjects} /> : (
          <ul className="s-list">
            {list.map((p) => (
              <li key={p.id}>
                <Link className="s-item" to={`/portal/project/${p.id}#berichten`}>
                  <span className={`s-ico ${p.unreadMessages ? "acc" : ""}`}>{p.unreadMessages || "·"}</span>
                  <div><div className="t">{p.title}</div><div className="s">{p.unreadMessages ? t.unread(p.unreadMessages) : t.noNewMessages}</div></div>
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
  const t = useT();
  const qc = useQueryClient();
  const me = useMe();
  const [f, setF] = useState({ name: "", company: "", phone: "" });
  const [pw, setPw] = useState({ next: "", repeat: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  useEffect(() => { if (me.data) setF({ name: me.data.name, company: me.data.company, phone: me.data.phone }); }, [me.data]);

  const save = useAction({
    fn: () => put("/portal/me", f),
    invalidate: () => [pkeys.me],
    success: t.saved,
    onSuccess: () => { supabase.auth.refreshSession().catch(() => {}); qc.invalidateQueries({ queryKey: pkeys.projects }); },
  });
  const changePw = useAction({
    fn: async () => {
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) throw new Error(error.message.includes("weak") || error.message.includes("pwned") ? t.passwordWeak : error.message);
    },
    success: t.passwordChanged,
    onSuccess: () => setPw({ next: "", repeat: "" }),
  });

  return (
    <main className="p-main" style={{ maxWidth: 720 }}>
      <div className="p-hello"><h1>{t.accountTitle}</h1><p>{me.data?.email}</p></div>
      <Card title={t.yourDetails}>
        <form className="s-form-grid" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <TextField label={t.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
          <TextField label={t.company} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} autoComplete="organization" />
          <TextField label={t.phone} type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
          <div className="full"><Button type="submit" variant="primary" loading={save.isPending} disabled={!f.name.trim()}>{t.save}</Button></div>
        </form>
      </Card>
      <Card title={t.changePassword}>
        <form className="s-form-grid" onSubmit={(e) => {
          e.preventDefault();
          if (pw.next.length < 8) return setPwError(t.passwordTooShort);
          if (pw.next !== pw.repeat) return setPwError(t.passwordsDiffer);
          setPwError(null);
          changePw.mutate();
        }}>
          <TextField label={t.newPassword} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <TextField label={t.repeat} type="password" autoComplete="new-password" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} error={pwError} />
          <div className="full"><Button type="submit" loading={changePw.isPending} disabled={!pw.next}>{t.changePassword}</Button></div>
        </form>
      </Card>
    </main>
  );
}
