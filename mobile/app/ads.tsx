import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AD_VISIT_MARKER } from "@shared/actionItems";
import { useAppData } from "@/AppData";
import type { Inquiry } from "@/api";
import { useColors } from "@/ThemeContext";
import { radius, timeAgo } from "@/theme";
import { Card, Chip, haptic, Press, Row, SectionLabel, Stack, Txt } from "@/ui/base";
import { Segmented } from "@/ui/form";
import { StatTile } from "@/ui/data";
import { Empty, SkeletonList, useToast } from "@/ui/feedback";
import { Screen } from "@/ui/Screen";
import { Sheet } from "@/ui/Sheet";

type Period = "7d" | "30d" | "90d" | "all";

interface Campaign {
  ref: string;
  page: string;
  visits: number;
  leads: Inquiry[];
  lastActivity: string;
}

/** Campaign refs travel inside the message body as `[ref:name]`. */
function extractRef(message: string) {
  return message.match(/\[ref:([^\]]+)\]/)?.[1] ?? "";
}

function cutoffFor(period: Period) {
  if (period === "all") return undefined;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Rebuilds campaign stats from the inquiries feed.
 *
 * Ad clicks are written as synthetic inquiries named `__ad_visit__` (ref in
 * `brand`, landing page JSON-encoded in `message`); real leads carry their ref
 * inside the message. Same derivation as the website's Ads page.
 */
function buildCampaigns(all: Inquiry[], cutoff?: Date): Campaign[] {
  const source = cutoff ? all.filter((i) => new Date(i.createdAt) >= cutoff) : all;
  const map = new Map<string, Campaign>();

  const ensure = (ref: string, page: string) => {
    if (!map.has(ref)) map.set(ref, { ref, page, visits: 0, leads: [], lastActivity: "" });
    return map.get(ref)!;
  };
  const bump = (stat: Campaign, date: string) => {
    if (!stat.lastActivity || date > stat.lastActivity) stat.lastActivity = date;
  };

  for (const inq of source) {
    if (inq.name === AD_VISIT_MARKER) {
      let page = "/";
      try {
        page = JSON.parse(inq.message).page || "/";
      } catch {
        // A visit row with an unparseable body still counts as a click.
      }
      const stat = ensure(inq.brand, page);
      stat.visits += 1;
      bump(stat, inq.createdAt);
    } else {
      const ref = extractRef(inq.message || "");
      if (ref) {
        const stat = ensure(ref, "");
        stat.leads.push(inq);
        bump(stat, inq.createdAt);
      }
    }
  }

  return [...map.values()].sort((a, b) =>
    b.leads.length !== a.leads.length ? b.leads.length - a.leads.length : b.visits - a.visits
  );
}

function conversion(visits: number, leads: number) {
  if (visits === 0) return leads > 0 ? "100%" : "—";
  return `${((leads / visits) * 100).toFixed(1)}%`;
}

export default function AdsScreen() {
  const c = useColors();
  const { inquiries, loading, refresh } = useAppData();
  const [period, setPeriod] = useState<Period>("30d");
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const campaigns = useMemo(() => buildCampaigns(inquiries, cutoffFor(period)), [inquiries, period]);

  const totals = useMemo(
    () => ({
      visits: campaigns.reduce((s, k) => s + k.visits, 0),
      leads: campaigns.reduce((s, k) => s + k.leads.length, 0),
    }),
    [campaigns]
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <Screen
      title="Advertenties"
      eyebrow={`${campaigns.length} campagne${campaigns.length === 1 ? "" : "s"}`}
      back
      fullBleedBottom
      onRefresh={handleRefresh}
      refreshing={refreshing}
      hero={
        <View style={{ marginBottom: 18 }}>
          <Segmented
            value={period}
            onChange={(v) => setPeriod(v)}
            size="sm"
            options={[
              { value: "7d", label: "7 dgn" },
              { value: "30d", label: "30 dgn" },
              { value: "90d", label: "90 dgn" },
              { value: "all", label: "Alles" },
            ]}
          />
        </View>
      }
    >
      {loading && !inquiries.length ? (
        <SkeletonList rows={4} />
      ) : campaigns.length === 0 ? (
        <Empty
          icon="target"
          title="Nog geen campagnedata"
          body="Zet ?ref=naam achter een link in je advertentie. Klikken en aanvragen worden dan hier bijgehouden."
        />
      ) : (
        <Stack gap={26}>
          <Row gap={10} align="stretch">
            <StatTile label="Klikken" value={totals.visits} icon="mouse-pointer" delay={20} />
            <StatTile
              label="Leads"
              value={totals.leads}
              icon="users"
              tone={c.ok}
              delay={70}
              sub={conversion(totals.visits, totals.leads)}
            />
          </Row>

          <View>
            <SectionLabel>Campagnes</SectionLabel>
            <Stack gap={9}>
              {campaigns.map((k, i) => (
                <Animated.View
                  key={k.ref}
                  entering={FadeInDown.delay(Math.min(i, 8) * 30).springify().damping(20)}
                >
                  <Press onPress={() => setDetail(k)} scale={0.985}>
                    <Card style={{ padding: 14 }}>
                      <Row gap={12} align="flex-start">
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: "600", color: c.fg }}>
                            {k.ref || "Zonder ref"}
                          </Text>
                          <Txt variant="meta" numberOfLines={1} style={{ fontSize: 11.5, marginTop: 3 }}>
                            {`${k.page || "—"} · ${timeAgo(k.lastActivity)}`}
                          </Txt>
                          <Row gap={7} style={{ marginTop: 9 }}>
                            <Chip tone="neutral">{`${k.visits} klik${k.visits === 1 ? "" : "ken"}`}</Chip>
                            <Chip tone={k.leads.length ? "ok" : "neutral"}>
                              {`${k.leads.length} lead${k.leads.length === 1 ? "" : "s"}`}
                            </Chip>
                          </Row>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontSize: 17,
                              fontWeight: "700",
                              color: c.copper,
                              fontVariant: ["tabular-nums"],
                            }}
                          >
                            {conversion(k.visits, k.leads.length)}
                          </Text>
                          <Txt variant="eyebrow" style={{ fontSize: 9, marginTop: 2 }}>
                            CVR
                          </Txt>
                        </View>
                      </Row>
                    </Card>
                  </Press>
                </Animated.View>
              ))}
            </Stack>
          </View>
        </Stack>
      )}

      <CampaignSheet campaign={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}

function CampaignSheet({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  const c = useColors();
  const toast = useToast();

  const trackingUrl = campaign
    ? `https://www.photodecaffeine.com${campaign.page || "/"}?ref=${campaign.ref}`
    : "";

  async function copy() {
    await Clipboard.setStringAsync(trackingUrl);
    haptic("success");
    toast("Link gekopieerd", "success");
  }

  return (
    <Sheet
      open={!!campaign}
      onClose={onClose}
      title={campaign?.ref}
      subtitle={campaign ? `${campaign.visits} klikken · ${campaign.leads.length} leads` : undefined}
    >
      {campaign && (
        <Stack gap={16} style={{ paddingBottom: 8 }}>
          <Press
            onPress={copy}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 13,
              borderRadius: radius.md,
              backgroundColor: c.surface2,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: c.fg2 }}>
              {trackingUrl}
            </Text>
            <Feather name="copy" size={15} color={c.copper} />
          </Press>

          <View>
            <SectionLabel>Leads uit deze campagne</SectionLabel>
            {campaign.leads.length === 0 ? (
              <Card style={{ padding: 16 }}>
                <Txt variant="body" style={{ fontSize: 13 }}>
                  Nog geen aanvragen via deze link.
                </Txt>
              </Card>
            ) : (
              <Stack gap={8}>
                {campaign.leads.map((lead) => (
                  <Card key={lead.id} style={{ padding: 13 }}>
                    <Row gap={10}>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "600", color: c.fg }}>
                          {lead.name}
                        </Text>
                        <Txt variant="meta" numberOfLines={1} style={{ fontSize: 11.5, marginTop: 2 }}>
                          {lead.email}
                        </Txt>
                      </View>
                      <Txt variant="meta" style={{ fontSize: 10.5, color: c.fg4 }}>
                        {timeAgo(lead.createdAt)}
                      </Txt>
                    </Row>
                  </Card>
                ))}
              </Stack>
            )}
          </View>
        </Stack>
      )}
    </Sheet>
  );
}
