import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, MessageSquareHeart, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { del, get, put } from "../api";
import { fmtDate } from "../format";
import { useAction } from "../queries";
import { Button, Card, Empty, ErrorState, PageHead, Photo, Pill, Segmented, Select, SkeletonList, useConfirm } from "../ui";
import type { Article } from "./Content";

type Review = {
  id: string; projectId: string; projectTitle: string; clientName: string; rating: number; text: string;
  portfolioArticleId: string | null; published: boolean; createdAt: string;
};
type Feedback = {
  id: string; projectId: string; projectTitle: string; clientName: string; createdAt: string;
  items: { id: string; scope: "photos" | "general"; photoUrls: string[]; category: string; text: string }[];
};

const k = { reviews: ["reviews"] as const, feedback: ["feedback"] as const };

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="s-row nowrap" style={{ gap: 1, color: "var(--accent)" }} aria-label={`${rating} van 5 sterren`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} fill={n <= rating ? "currentColor" : "none"} style={{ opacity: n <= rating ? 1 : 0.35 }} />)}
    </span>
  );
}

export function ReviewsPage() {
  const [tab, setTab] = useState<"reviews" | "feedback">("reviews");
  const reviews = useQuery({ queryKey: k.reviews, queryFn: () => get<{ reviews: Review[] }>("/admin/reviews").then((r) => r.reviews) });
  const feedback = useQuery({ queryKey: k.feedback, queryFn: () => get<{ feedback: Feedback[] }>("/admin/feedback").then((r) => r.feedback) });
  const portfolio = useQuery({ queryKey: ["portfolio"], queryFn: () => get<{ articles: Article[] }>("/admin/portfolio").then((r) => r.articles) });
  const confirm = useConfirm();

  const update = useAction({
    fn: (v: { id: string; patch: Partial<Review> }) => put(`/admin/reviews/${v.id}`, v.patch),
    invalidate: () => [k.reviews],
    success: (_d, v) => (v.patch.published === undefined ? "Gekoppeld" : v.patch.published ? "Staat op de site" : "Van de site gehaald"),
  });
  const remove = useAction({ fn: (id: string) => del(`/admin/reviews/${id}`), invalidate: () => [k.reviews], success: "Review verwijderd" });

  const list = reviews.data || [];
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  const pieces = (portfolio.data || []).filter((a) => !a.category.startsWith("_"));

  return (
    <div className="s-view">
      <PageHead
        title="Reviews en feedback"
        sub={list.length ? `${list.length} reviews, gemiddeld ${avg.toFixed(1).replace(".", ",")} sterren. Alleen wat je publiceert komt op de site.` : "Vraag om een review vanaf een geleverd project."}
      />
      <Segmented<"reviews" | "feedback"> label="Weergave" value={tab} onChange={setTab} options={[
        { value: "reviews", label: `Reviews (${list.length})` },
        { value: "feedback", label: `Feedback (${feedback.data?.length ?? 0})` },
      ]} />
      {tab === "reviews" ? (
        <Card bodyClass="none">
          {reviews.isError ? <div className="s-card-body"><ErrorState error={reviews.error} /></div> : reviews.isLoading ? <SkeletonList rows={3} /> : list.length === 0 ? (
            <Empty icon={<Star />} title="Nog geen reviews">Vraag erom vanaf het tabblad Overzicht van een geleverd project.</Empty>
          ) : (
            <ul className="s-list">
              {list.map((r) => (
                <li key={r.id} className="s-card-body s-stack">
                  <div className="s-row between">
                    <div className="s-row"><Stars rating={r.rating} /><b>{r.clientName}</b><span className="s-small s-muted">· <Link to={`/admin/project/${r.projectId}`}>{r.projectTitle}</Link> · {fmtDate(r.createdAt)}</span></div>
                    <Pill tone={r.published ? "ok" : undefined}>{r.published ? "Op de site" : "Niet gepubliceerd"}</Pill>
                  </div>
                  <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>{r.text}</p>
                  <div className="s-row">
                    <Button size="sm" variant={r.published ? "default" : "primary"} icon={r.published ? <EyeOff /> : <Eye />} onClick={() => update.mutate({ id: r.id, patch: { published: !r.published } })}>
                      {r.published ? "Van de site halen" : "Publiceren"}
                    </Button>
                    <Select aria-label="Koppel aan portfoliostuk" value={r.portfolioArticleId || ""} style={{ width: 260 }}
                      onChange={(e) => update.mutate({ id: r.id, patch: { portfolioArticleId: e.target.value || null } })}>
                      <option value="">Niet gekoppeld aan portfolio</option>
                      {pieces.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                    </Select>
                    <Button size="sm" variant="ghost" iconOnly aria-label="Verwijderen" icon={<Trash2 />} style={{ marginLeft: "auto" }}
                      onClick={async () => { if (await confirm({ title: "Review verwijderen?", body: "Daarna kun je de klant opnieuw om een review vragen.", danger: true, confirm: "Verwijderen" })) remove.mutate(r.id); }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card bodyClass="none">
          {feedback.isError ? <div className="s-card-body"><ErrorState error={feedback.error} /></div> : feedback.isLoading ? <SkeletonList rows={3} /> : !feedback.data?.length ? (
            <Empty icon={<MessageSquareHeart />} title="Nog geen feedback" />
          ) : (
            <ul className="s-list">
              {feedback.data.map((f) => (
                <li key={f.id} className="s-card-body s-stack">
                  <div className="s-row"><b>{f.clientName}</b><span className="s-small s-muted">· <Link to={`/admin/project/${f.projectId}`}>{f.projectTitle}</Link> · {fmtDate(f.createdAt)}</span></div>
                  {f.items.map((i) => (
                    <div key={i.id} className="s-stack sm" style={{ padding: 12, background: "var(--sunken)", borderRadius: 8 }}>
                      <span className="s-eyebrow">{i.scope === "photos" ? `${i.photoUrls.length} foto${i.photoUrls.length === 1 ? "" : "'s"}` : i.category}</span>
                      <p style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{i.text}</p>
                      {i.photoUrls.length > 0 && (
                        <div className="s-row">{i.photoUrls.slice(0, 8).map((u) => <Photo key={u} src={u} style={{ width: 72, aspectRatio: "1" }} />)}</div>
                      )}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
