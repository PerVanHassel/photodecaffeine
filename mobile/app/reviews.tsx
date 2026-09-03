import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useApi, useQuery, type QueryState } from "@/useApi";
import type { FeedbackEntry, Review } from "@/api";
import { useColors } from "@/ThemeContext";
import { dateShort, radius } from "@/theme";
import { Avatar, Card, Chip, Divider, Press, Row, SectionLabel, Stack, Txt } from "@/ui/base";
import { Segmented } from "@/ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "@/ui/feedback";
import { Screen } from "@/ui/Screen";
import { ConfirmSheet, Sheet } from "@/ui/Sheet";

type Tab = "reviews" | "feedback";

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const c = useColors();
  return (
    <Row gap={2} style={{ alignItems: "center" }} align="center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Feather
          key={n}
          name="star"
          size={size}
          color={n <= rating ? c.copper : c.line2}
        />
      ))}
    </Row>
  );
}

export default function ReviewsScreen() {
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
      back
      fullBleedBottom
      onRefresh={refreshAll}
      refreshing={reviews.refreshing || feedback.refreshing}
      hero={
        <View style={{ marginBottom: 18 }}>
          <Segmented
            value={tab}
            onChange={(v) => setTab(v)}
            options={[
              { value: "reviews", label: "Beoordelingen", badge: reviews.data?.length },
              { value: "feedback", label: "Foto-feedback", badge: feedback.data?.length },
            ]}
          />
        </View>
      }
    >
      {tab === "reviews" ? <ReviewsTab query={reviews} /> : <FeedbackTab query={feedback} />}
    </Screen>
  );
}

function ReviewsTab({ query }: { query: QueryState<Review[]> }) {
  const c = useColors();
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
        icon="star"
        title="Nog geen reviews"
        body="Vraag een klant om een beoordeling vanuit hun projectpagina in het portaal."
      />
    );
  }

  return (
    <>
      <Card style={{ padding: 18, marginBottom: 20 }}>
        <Row gap={14}>
          <Text
            style={{ fontSize: 34, fontWeight: "700", color: c.fg, fontVariant: ["tabular-nums"] }}
          >
            {average.toFixed(1)}
          </Text>
          <View>
            <Stars rating={Math.round(average)} />
            <Txt variant="meta" style={{ marginTop: 5, fontSize: 11.5 }}>
              {`${list.length} beoordeling${list.length === 1 ? "" : "en"}`}
            </Txt>
          </View>
        </Row>
      </Card>

      <Stack gap={10}>
        {list.map((r, i) => (
          <Animated.View
            key={r.id}
            layout={LinearTransition.springify().damping(22)}
            entering={FadeInDown.delay(Math.min(i, 8) * 30).springify().damping(20)}
          >
            <Card style={{ padding: 15 }}>
              <Row gap={12} align="flex-start">
                <Avatar name={r.clientName} size={38} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: c.fg }}>
                    {r.clientName}
                  </Text>
                  <Txt variant="meta" numberOfLines={1} style={{ fontSize: 11.5, marginTop: 2 }}>
                    {`${r.projectTitle} · ${dateShort(r.createdAt)}`}
                  </Txt>
                  <View style={{ marginTop: 8 }}>
                    <Stars rating={r.rating} size={13} />
                  </View>
                </View>
                <Chip tone={r.published ? "ok" : "neutral"}>
                  {r.published ? "Live" : "Verborgen"}
                </Chip>
              </Row>

              {!!r.text && (
                <>
                  <Divider style={{ marginVertical: 13 }} />
                  <Text selectable style={{ fontSize: 13.5, color: c.fg2, lineHeight: 21 }}>
                    {r.text}
                  </Text>
                </>
              )}

              <Row gap={6} style={{ marginTop: 13, justifyContent: "flex-end" }}>
                <Press
                  onPress={() => togglePublished(r)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 13,
                    paddingVertical: 8,
                    borderRadius: radius.pill,
                    borderWidth: StyleSheet.hairlineWidth * 2,
                    borderColor: c.line,
                  }}
                >
                  <Feather
                    name={r.published ? "eye" : "eye-off"}
                    size={14}
                    color={r.published ? c.ok : c.fg3}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: r.published ? c.ok : c.fg3,
                    }}
                  >
                    {r.published ? "Zichtbaar" : "Publiceren"}
                  </Text>
                </Press>
                <Press
                  onPress={() => setPendingDelete(r)}
                  accessibilityLabel="Verwijderen"
                  style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name="trash-2" size={15} color={c.fg4} />
                </Press>
              </Row>
            </Card>
          </Animated.View>
        ))}
      </Stack>

      <ConfirmSheet
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title="Review verwijderen?"
        body={
          pendingDelete
            ? `De beoordeling van ${pendingDelete.clientName} verdwijnt definitief.`
            : undefined
        }
      />
    </>
  );
}

function FeedbackTab({ query }: { query: QueryState<FeedbackEntry[]> }) {
  const c = useColors();
  const [detail, setDetail] = useState<FeedbackEntry | null>(null);

  if (query.loading) return <SkeletonList rows={3} height={82} />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.refresh} />;

  const list = query.data ?? [];

  if (list.length === 0) {
    return (
      <Empty
        icon="message-square"
        title="Nog geen feedback"
        body="Klanten kunnen per foto opmerkingen achterlaten vanuit hun galerij."
      />
    );
  }

  return (
    <>
      <Stack gap={9}>
        {list.map((entry, i) => (
          <Animated.View
            key={entry.id}
            entering={FadeInDown.delay(Math.min(i, 8) * 30).springify().damping(20)}
          >
            <Press onPress={() => setDetail(entry)} scale={0.985}>
              <Card style={{ padding: 14 }}>
                <Row gap={12}>
                  <Avatar name={entry.clientName} size={38} tone="info" />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: c.fg }}>
                      {entry.clientName}
                    </Text>
                    <Txt variant="meta" numberOfLines={1} style={{ fontSize: 11.5, marginTop: 2 }}>
                      {`${entry.projectTitle} · ${dateShort(entry.createdAt)}`}
                    </Txt>
                  </View>
                  <Chip tone="copper">
                    {`${entry.items.length} punt${entry.items.length === 1 ? "" : "en"}`}
                  </Chip>
                </Row>
              </Card>
            </Press>
          </Animated.View>
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
                  {!!item.category && <Chip tone="neutral">{item.category}</Chip>}
                </Row>

                {item.photoUrls.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                    style={{ marginBottom: 11 }}
                  >
                    {item.photoUrls.map((url) => (
                      <Image
                        key={url}
                        source={{ uri: url }}
                        style={{
                          width: 74,
                          height: 74,
                          borderRadius: radius.sm,
                          borderWidth: StyleSheet.hairlineWidth * 2,
                          borderColor: c.line,
                        }}
                      />
                    ))}
                  </ScrollView>
                )}

                <Text selectable style={{ fontSize: 13.5, color: c.fg2, lineHeight: 21 }}>
                  {item.text}
                </Text>
              </Card>
            ))}
          </Stack>
        )}
      </Sheet>
    </>
  );
}
