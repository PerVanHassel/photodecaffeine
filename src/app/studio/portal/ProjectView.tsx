import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Globe, Images, MessageSquareHeart, Send, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { get, post } from "../api";
import { dayLabel, fmtDateTime, fmtTime } from "../format";
import { useLiveMessages } from "../live";
import { useAction } from "../queries";
import { Button, Card, Empty, ErrorState, Photo, Skeleton, Textarea } from "../ui";
import { journeyIndex, pkeys, usePortalMessages, usePortalProject } from "./data";
import { useT } from "./i18n";
import { appointmentTitle, AppointmentCard, Journey } from "./Overview";

export function PortalProjectPage() {
  const { id = "" } = useParams();
  const t = useT();
  const data = usePortalProject(id);
  if (data.isError) return <main className="p-main"><Link to="/portal/dashboard" className="s-back"><ArrowLeft size={14} /> {t.back}</Link><ErrorState error={data.error} /></main>;
  if (!data.data) return <main className="p-main"><Skeleton h={40} w={320} /><Skeleton h={90} r={12} /><Skeleton h={320} r={12} /></main>;
  const { project: p, locations } = data.data;
  const upcoming = p.events.filter((e) => new Date(e.endsAt || e.startsAt).getTime() > Date.now());
  const past = p.events.filter((e) => new Date(e.endsAt || e.startsAt).getTime() <= Date.now()).reverse();
  const cover = p.gallerySettings.coverUrl || p.gallery[0]?.url;
  const delivered = ["delivered", "review", "archived"].includes(p.stage);

  return (
    <main className="p-main">
      <Link to="/portal/dashboard" className="s-back"><ArrowLeft size={14} /> {t.back}</Link>
      <div className="p-hello">
        <p className="s-eyebrow">{t.journey[journeyIndex(p.stage)]}</p>
        <h1>{p.title}</h1>
        {p.description && <p style={{ whiteSpace: "pre-wrap" }}>{p.description}</p>}
      </div>
      <Journey project={p} compact />

      <div className="s-grid-2 portal">
        <div className="s-stack lg">
          {p.gallery.length > 0 && (
            <Link to={`/portal/project/${p.id}/gallery`} className="s-card link" style={{ overflow: "hidden" }}>
              <Photo src={cover} style={{ aspectRatio: "21/9", borderRadius: 0 }} />
              <div className="s-card-body s-row between">
                <div><b>{p.gallerySettings.title || t.yourGallery}</b><div className="s-small s-muted">{t.photosCount(p.gallery.length)}{p.favoriteIds?.length ? ` · ${t.favoritesChosen(p.favoriteIds.length)}` : ""}</div></div>
                <span className="s-btn primary"><Images size={15} />{delivered ? t.viewAndDownload : t.chooseFavorites}</span>
              </div>
            </Link>
          )}
          <Thread projectId={p.id} />
          <Engagement projectId={p.id} delivered={delivered} />
        </div>
        <div className="s-stack lg">
          {upcoming[0] && <AppointmentCard event={upcoming[0]} location={upcoming[0].locationId ? locations[upcoming[0].locationId] : null} projectTitle={p.title} />}
          {(upcoming.length > 1 || past.length > 0) && (
            <Card title={t.appointments} bodyClass="none">
              <ul className="s-list">
                {[...upcoming.slice(1), ...past].map((e) => {
                  const isPast = past.includes(e);
                  return (
                    <li key={e.id} className="s-item" style={{ gridTemplateColumns: "minmax(0,1fr) auto", opacity: isPast ? 0.6 : 1 }}>
                      <div><div className="t">{appointmentTitle(e, t)}</div><div className="s">{dayLabel(e.startsAt)}{e.allDay ? "" : `, ${fmtTime(e.startsAt)}`}</div></div>
                      {isPast && <Check size={15} className="s-faint" />}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          {p.deliverables.length > 0 && (
            <Card title={t.whatYouGet}>
              <ul className="s-shots">
                {p.deliverables.map((d, i) => (
                  <li key={i} className={d.done ? "done" : undefined} style={{ gridTemplateColumns: "22px minmax(0,1fr)" }}>
                    <span className={`s-tick ${d.done ? "on" : ""}`}>{d.done && <Check />}</span>
                    <span className="label">{d.count ? `${d.count} ` : ""}{d.name}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {p.demos.filter((d) => d.live).map((d) => (
            <a key={d.slug} className="s-card link s-card-body s-row" href={`/demo/${d.slug}`} target="_blank" rel="noreferrer"><Globe size={16} /> {t.viewDemo}</a>
          ))}
        </div>
      </div>
    </main>
  );
}

function Thread({ projectId }: { projectId: string }) {
  const t = useT();
  const qc = useQueryClient();
  const messages = usePortalMessages(projectId);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useLiveMessages(projectId, pkeys.messages(projectId));
  const list = messages.data || [];
  const unread = list.some((m) => m.senderRole === "pdc" && !m.readAt);

  useEffect(() => { if (window.location.hash === "#berichten") end.current?.scrollIntoView({ block: "end" }); }, [list.length]);
  useEffect(() => {
    if (!unread) return;
    post(`/portal/project/${projectId}/messages/read`).then(() => qc.invalidateQueries({ queryKey: pkeys.projects })).catch(() => {});
  }, [unread, projectId, qc]);

  const send = useAction({
    fn: (content: string) => post(`/portal/project/${projectId}/messages`, { content }),
    invalidate: () => [pkeys.messages(projectId)],
    success: t.sent,
    onSuccess: () => setText(""),
  });

  return (
    <Card title={<h2 id="berichten">{t.messages}</h2>} bodyClass="none">
      <div className="s-card-body" style={{ maxHeight: 460, overflowY: "auto" }}>
        {messages.isLoading ? <Skeleton h={60} /> : list.length === 0 ? (
          <Empty title={t.noMessages}>{t.noMessagesHint}</Empty>
        ) : (
          <div className="s-msgs">
            {list.map((m) => (
              <div key={m.id} className={`s-msg ${m.senderRole === "client" ? "me" : ""}`}>
                <b>{m.senderRole === "client" ? t.you : m.senderName || "PhotoDeCaffeine"}</b>
                {m.content}
                <small>{fmtDateTime(m.createdAt)}</small>
              </div>
            ))}
            <div ref={end} />
          </div>
        )}
      </div>
      <form className="s-composer" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()); }}>
        <Textarea aria-label={t.messages} placeholder={t.writeMessage} value={text} onChange={(e) => setText(e.target.value)} rows={2}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && text.trim()) send.mutate(text.trim()); }} />
        <Button type="submit" variant="primary" icon={<Send />} loading={send.isPending} disabled={!text.trim()}>{t.send}</Button>
      </form>
    </Card>
  );
}

type EngagementData = { reviewRequested: boolean; feedbackRequested: boolean; review: { rating: number; text: string } | null; feedbackCount: number };

function Engagement({ projectId, delivered }: { projectId: string; delivered: boolean }) {
  const t = useT();
  const data = useQuery({ queryKey: ["portal", "engagement", projectId], queryFn: () => get<EngagementData>(`/portal/project/${projectId}/engagement`) });
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const submit = useAction({
    fn: () => post(`/portal/project/${projectId}/review`, { rating, text }),
    invalidate: () => [["portal", "engagement", projectId]],
    success: t.reviewThanks,
  });
  const e = data.data;
  if (!e || (!delivered && !e.reviewRequested && !e.feedbackRequested)) return null;

  return (
    <Card title={t.howWasIt}>
      <div className="s-stack">
        {e.review ? <p className="s-small">{t.youRated("★".repeat(e.review.rating))}</p> : e.reviewRequested ? (
          <>
            <div className="s-row" role="radiogroup" aria-label={t.rating}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={t.stars(n)} onClick={() => setRating(n)}
                  style={{ border: 0, background: "none", padding: 2, color: n <= rating ? "var(--accent)" : "var(--line-strong)" }}>
                  <Star size={26} fill={n <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <Textarea aria-label={t.howWasIt} placeholder={t.reviewPlaceholder} rows={3} value={text} onChange={(ev) => setText(ev.target.value)} />
            <Button variant="primary" style={{ alignSelf: "flex-start" }} disabled={!rating || !text.trim()} loading={submit.isPending} onClick={() => submit.mutate()}>{t.sendReview}</Button>
          </>
        ) : null}
        {(e.feedbackRequested || delivered) && (
          <Link to={`/portal/project/${projectId}/feedback`} className="s-btn" style={{ alignSelf: "flex-start" }}><MessageSquareHeart size={15} />{t.giveFeedback}</Link>
        )}
      </div>
    </Card>
  );
}
