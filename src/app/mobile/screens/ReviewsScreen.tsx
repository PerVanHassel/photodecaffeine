import { motion } from "motion/react";
import { Eye, EyeOff, MessageSquare, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useApi, useQuery } from "../useApi";
import type { FeedbackEntry, Review } from "../api";
import { c, dateShort, radius, spring } from "../theme";
import { Avatar, Card, Chip, Divider, Ellipsis, Press, Row, Stack } from "../ui/base";
import { Segmented } from "../ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "../ui/feedback";
import { Screen } from "../ui/Screen";
import { ConfirmSheet, Sheet } from "../ui/Sheet";

type Tab = "reviews" | "feedback";

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span
      style={{ display: "inline-flex", gap: 2, alignItems: "center" }}
      aria-label={`${rating} van 5 sterren`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color={c.copper}
          fill={n <= rating ? "var(--m-copper)" : "none"}
          strokeWidth={2}
        />
      ))}
    </span>
  );
}

export function ReviewsScreen() {
  const [tab, setTab] = useState<Tab>("reviews");
  const api = useApi();

  const reviews = useQuery(() => api.reviews(), [api]);
  const feedback = useQuery(() => api.feedback(), [api]);

  async function refreshAll() {
    await Promise.all([reviews.refresh(), feedback.refresh()]);
  }

  const publishedCount = (reviews.data ?? []).filter((r) => r.published).length;

  return (
    <Screen
      title="Reviews"
      eyebrow={`${publishedCount} gepubliceerd`}
      back="/app/more"
      fullBleedBottom
      onRefresh={refreshAll}
      refreshing={reviews.refreshing || feedback.refreshing}
      hero={
        <div style={{ marginBottom: 18 }}>
          <Segmented
            value={tab}
            onChange={(v) => setTab(v)}
            options={[
              { value: "reviews", label: "Beoordelingen", badge: reviews.data?.length },
              { value: "feedback", label: "Foto-feedback", badge: feedback.data?.length },
            ]}
          />
        </div>
      }
    >
      {tab === "reviews" ? (
        <ReviewsTab query={reviews} />
      ) : (
        <FeedbackTab query={feedback} />
      )}
    </Screen>
  );
}

function ReviewsTab({ query }: { query: ReturnType<typeof useQuery<Review[]>> }) {
  const api = useApi();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);

  const list = query.data ?? [];

  const average = useMemo(() => {
    if (!list.length) return 0;
    return list.reduce((s, r) => s + r.rating, 0) / list.length;
  }, [list]);

  async function togglePublished(review: Review) {
    const next = !review.published;
    query.set((prev) =>
      (prev ?? []).map((r) => (r.id === review.id ? { ...r, published: next } : r))
    );
    try {
      await api.updateReview(review.id, { published: next });
    } catch (err) {
      query.set((prev) =>
        (prev ?? []).map((r) => (r.id === review.id ? { ...r, published: !next } : r))
      );
      toast(err instanceof Error ? err.message : "Bijwerken mislukt", "error");
    }
  }

  async function remove(review: Review) {
    setPendingDelete(null);
    const before = query.data;
    query.set((prev) => (prev ?? []).filter((r) => r.id !== review.id));
    try {
      await api.deleteReview(review.id);
      toast("Review verwijderd", "success");
    } catch (err) {
      if (before) query.set(before);
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
  }

  if (query.loading) return <SkeletonList rows={4} height={110} />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.refresh} />;

  if (list.length === 0) {
    return (
      <Empty
        icon={<Star size={22} />}
        title="Nog geen reviews"
        body="Vraag een klant om een beoordeling vanuit hun projectpagina in het portaal."
      />
    );
  }

  return (
    <>
      <Card style={{ padding: 18, marginBottom: 20 }}>
        <Row gap={14}>
          <div
            className="m-num"
            style={{ fontSize: 34, fontWeight: 700, color: c.fg, lineHeight: 1 }}
          >
            {average.toFixed(1)}
          </div>
          <div>
            <Stars rating={Math.round(average)} />
            <div style={{ fontSize: 11.5, color: c.fg4, marginTop: 5 }}>
              {list.length} beoordeling{list.length === 1 ? "" : "en"}
            </div>
          </div>
        </Row>
      </Card>

      <Stack gap={10}>
        {list.map((r, i) => (
          <motion.div
            key={r.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.smooth, delay: Math.min(i, 8) * 0.03 }}
          >
            <Card style={{ padding: 15 }}>
              <Row gap={12} align="flex-start">
                <Avatar name={r.clientName} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Ellipsis style={{ fontSize: 14, fontWeight: 650, color: c.fg }}>
                    {r.clientName}
                  </Ellipsis>
                  <Ellipsis style={{ fontSize: 11.5, color: c.fg4, marginTop: 2 }}>
                    {r.projectTitle} · {dateShort(r.createdAt)}
                  </Ellipsis>
                  <div style={{ marginTop: 8 }}>
                    <Stars rating={r.rating} size={13} />
                  </div>
                </div>
                <Chip tone={r.published ? "ok" : "neutral"}>{r.published ? "Live" : "Verborgen"}</Chip>
              </Row>

              {r.text && (
                <>
                  <Divider style={{ margin: "13px 0" }} />
                  <div
                    className="m-selectable"
                    style={{ fontSize: 13.5, color: c.fg2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}
                  >
                    {r.text}
                  </div>
                </>
              )}

              <Row gap={6} style={{ marginTop: 13, justifyContent: "flex-end" }}>
                <Press
                  onClick={() => togglePublished(r)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 13px",
                    borderRadius: radius.pill,
                    border: `1px solid ${c.line}`,
                    fontSize: 12,
                    fontWeight: 650,
                    color: r.published ? c.ok : c.fg3,
                  }}
                >
                  {r.published ? <Eye size={14} /> : <EyeOff size={14} />}
                  {r.published ? "Zichtbaar" : "Publiceren"}
                </Press>
                <Press
                  onClick={() => setPendingDelete(r)}
                  aria-label="Verwijderen"
                  style={{ width: 36, height: 36, display: "grid", placeItems: "center", color: c.fg4 }}
                >
                  <Trash2 size={15} />
                </Press>
              </Row>
            </Card>
          </motion.div>
        ))}
      </Stack>

      <ConfirmSheet
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title="Review verwijderen?"
        body={pendingDelete ? `De beoordeling van ${pendingDelete.clientName} verdwijnt definitief.` : undefined}
      />
    </>
  );
}

function FeedbackTab({ query }: { query: ReturnType<typeof useQuery<FeedbackEntry[]>> }) {
  const [detail, setDetail] = useState<FeedbackEntry | null>(null);

  if (query.loading) return <SkeletonList rows={3} height={82} />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.refresh} />;

  const list = query.data ?? [];

  if (list.length === 0) {
    return (
      <Empty
        icon={<MessageSquare size={22} />}
        title="Nog geen feedback"
        body="Klanten kunnen per foto opmerkingen achterlaten vanuit hun galerij."
      />
    );
  }

  return (
    <>
      <Stack gap={9}>
        {list.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.smooth, delay: Math.min(i, 8) * 0.03 }}
          >
            <button
              type="button"
              onClick={() => setDetail(entry)}
              style={{
                display: "block",
                width: "100%",
                border: "none",
                padding: 0,
                background: "none",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <Card style={{ padding: 14 }}>
                <Row gap={12}>
                  <Avatar name={entry.clientName} size={38} tone="info" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Ellipsis style={{ fontSize: 14, fontWeight: 650, color: c.fg }}>
                      {entry.clientName}
                    </Ellipsis>
                    <Ellipsis style={{ fontSize: 11.5, color: c.fg4, marginTop: 2 }}>
                      {entry.projectTitle} · {dateShort(entry.createdAt)}
                    </Ellipsis>
                  </div>
                  <Chip tone="copper">
                    {entry.items.length} punt{entry.items.length === 1 ? "" : "en"}
                  </Chip>
                </Row>
              </Card>
            </button>
          </motion.div>
        ))}
      </Stack>

      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.clientName}
        subtitle={detail ? `${detail.projectTitle} · ${dateShort(detail.createdAt)}` : undefined}
      >
        {detail && (
          <Stack gap={12} style={{ paddingBottom: 8 }}>
            {detail.items.map((item) => (
              <Card key={item.id} style={{ padding: 14 }}>
                <Row gap={7} style={{ marginBottom: 10, flexWrap: "wrap" }}>
                  <Chip tone={item.scope === "photos" ? "copper" : "neutral"}>
                    {item.scope === "photos" ? "Over foto's" : "Algemeen"}
                  </Chip>
                  {item.category && <Chip tone="neutral">{item.category}</Chip>}
                </Row>

                {item.photoUrls.length > 0 && (
                  <div
                    className="m-hscroll"
                    style={{ gap: 6, marginBottom: 11, scrollSnapType: "none" }}
                  >
                    {item.photoUrls.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt=""
                        loading="lazy"
                        style={{
                          width: 74,
                          height: 74,
                          flexShrink: 0,
                          objectFit: "cover",
                          borderRadius: radius.sm,
                          border: `1px solid ${c.line}`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div
                  className="m-selectable"
                  style={{ fontSize: 13.5, color: c.fg2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}
                >
                  {item.text}
                </div>
              </Card>
            ))}
          </Stack>
        )}
      </Sheet>
    </>
  );
}
