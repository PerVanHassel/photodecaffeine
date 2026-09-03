import { motion } from "motion/react";
import { Copy, Megaphone, MousePointerClick, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppData } from "../AppData";
import { AD_VISIT_MARKER } from "../../lib/actionItems";
import type { Inquiry } from "../api";
import { c, radius, spring, timeAgo } from "../theme";
import { haptic } from "../haptics";
import { Card, Chip, Ellipsis, Press, Row, SectionLabel, Stack } from "../ui/base";
import { Segmented } from "../ui/form";
import { StatTile } from "../ui/data";
import { Empty, SkeletonList, useToast } from "../ui/feedback";
import { Screen } from "../ui/Screen";
import { Sheet } from "../ui/Sheet";

type Period = "7d" | "30d" | "90d" | "all";

interface Campaign {
  ref: string;
  page: string;
  visits: number;
  leads: Inquiry[];
  lastActivity: string;
}

/** Campaign refs travel in the message body as `[ref:name]`. */
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
 * Ad clicks are written as synthetic inquiries named `__ad_visit__` (the ref in
 * `brand`, the landing page JSON-encoded in `message`); real leads carry their
 * ref inside the message. Same derivation as the desktop Ads page.
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

export function AdsScreen() {
  const { inquiries, loading, refresh } = useAppData();
  const [period, setPeriod] = useState<Period>("30d");
  const [detail, setDetail] = useState<Campaign | null>(null);

  const campaigns = useMemo(
    () => buildCampaigns(inquiries, cutoffFor(period)),
    [inquiries, period]
  );

  const totals = useMemo(
    () => ({
      visits: campaigns.reduce((s, k) => s + k.visits, 0),
      leads: campaigns.reduce((s, k) => s + k.leads.length, 0),
    }),
    [campaigns]
  );

  return (
    <Screen
      title="Advertenties"
      eyebrow={`${campaigns.length} campagne${campaigns.length === 1 ? "" : "s"}`}
      back="/app/more"
      fullBleedBottom
      onRefresh={refresh}
      hero={
        <div style={{ marginBottom: 18 }}>
          <Segmented
            value={period}
            onChange={(v) => setPeriod(v)}
            size="sm"
            options={[
              { value: "7d", label: "7 dagen" },
              { value: "30d", label: "30 dagen" },
              { value: "90d", label: "90 dagen" },
              { value: "all", label: "Alles" },
            ]}
          />
        </div>
      }
    >
      {loading && !inquiries.length ? (
        <SkeletonList rows={4} />
      ) : campaigns.length === 0 ? (
        <Empty
          icon={<Megaphone size={22} />}
          title="Nog geen campagnedata"
          body="Zet ?ref=naam achter een link in je advertentie. Klikken en aanvragen worden dan hier bijgehouden."
        />
      ) : (
        <Stack gap={26}>
          <div style={{ display: "flex", gap: 10 }}>
            <StatTile
              label="Klikken"
              value={totals.visits}
              icon={<MousePointerClick size={15} />}
              delay={0.02}
            />
            <StatTile
              label="Leads"
              value={totals.leads}
              icon={<Users size={15} />}
              tone={c.ok}
              delay={0.07}
              sub={conversion(totals.visits, totals.leads)}
            />
          </div>

          <section>
            <SectionLabel>Campagnes</SectionLabel>
            <Stack gap={9}>
              {campaigns.map((k, i) => (
                <motion.div
                  key={k.ref}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.smooth, delay: Math.min(i, 8) * 0.03 }}
                >
                  <button
                    type="button"
                    onClick={() => setDetail(k)}
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
                      <Row gap={12} align="flex-start">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Ellipsis style={{ fontSize: 14.5, fontWeight: 650, color: c.fg }}>
                            {k.ref || "Zonder ref"}
                          </Ellipsis>
                          <Ellipsis style={{ fontSize: 11.5, color: c.fg4, marginTop: 3 }}>
                            {k.page || "—"} · {timeAgo(k.lastActivity)}
                          </Ellipsis>
                          <Row gap={7} style={{ marginTop: 9 }}>
                            <Chip tone="neutral">{k.visits} klik{k.visits === 1 ? "" : "ken"}</Chip>
                            <Chip tone={k.leads.length ? "ok" : "neutral"}>
                              {k.leads.length} lead{k.leads.length === 1 ? "" : "s"}
                            </Chip>
                          </Row>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div
                            className="m-num"
                            style={{ fontSize: 17, fontWeight: 700, color: c.copper }}
                          >
                            {conversion(k.visits, k.leads.length)}
                          </div>
                          <div style={{ fontSize: 9.5, color: c.fg4, fontWeight: 600, letterSpacing: "0.1em" }}>
                            CVR
                          </div>
                        </div>
                      </Row>
                    </Card>
                  </button>
                </motion.div>
              ))}
            </Stack>
          </section>
        </Stack>
      )}

      <CampaignSheet campaign={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}

function CampaignSheet({
  campaign,
  onClose,
}: {
  campaign: Campaign | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const trackingUrl = campaign
    ? `https://www.photodecaffeine.com${campaign.page || "/"}?ref=${campaign.ref}`
    : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      haptic("success");
      toast("Link gekopieerd", "success");
    } catch {
      toast("Kopiëren lukte niet", "error");
    }
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
            onClick={copy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 13,
              borderRadius: radius.md,
              backgroundColor: c.surface2,
              border: `1px solid ${c.line}`,
            }}
          >
            <Ellipsis style={{ flex: 1, fontSize: 12, color: c.fg2, fontFamily: "monospace" }}>
              {trackingUrl}
            </Ellipsis>
            <Copy size={15} color={c.copper} style={{ flexShrink: 0 }} />
          </Press>

          <div>
            <SectionLabel>Leads uit deze campagne</SectionLabel>
            {campaign.leads.length === 0 ? (
              <Card style={{ padding: 16 }}>
                <div style={{ fontSize: 13, color: c.fg3 }}>
                  Nog geen aanvragen via deze link.
                </div>
              </Card>
            ) : (
              <Stack gap={8}>
                {campaign.leads.map((lead) => (
                  <Card key={lead.id} style={{ padding: 13 }}>
                    <Row gap={10}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Ellipsis style={{ fontSize: 13.5, fontWeight: 650, color: c.fg }}>
                          {lead.name}
                        </Ellipsis>
                        <Ellipsis style={{ fontSize: 11.5, color: c.fg4, marginTop: 2 }}>
                          {lead.email}
                        </Ellipsis>
                      </div>
                      <span style={{ fontSize: 10.5, color: c.fg4, fontWeight: 600, flexShrink: 0 }}>
                        {timeAgo(lead.createdAt)}
                      </span>
                    </Row>
                  </Card>
                ))}
              </Stack>
            )}
          </div>
        </Stack>
      )}
    </Sheet>
  );
}
