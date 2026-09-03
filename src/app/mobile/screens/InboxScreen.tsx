import { motion } from "motion/react";
import {
  Check,
  Copy,
  Inbox,
  Mail,
  MessageCircle,
  Phone,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useAppData } from "../AppData";
import { useHandled } from "../useHandled";
import { AD_VISIT_MARKER } from "../../lib/actionItems";
import type { Inquiry } from "../api";
import { c, dateFull, radius, spring, timeAgo } from "../theme";
import { haptic } from "../haptics";
import { Avatar, Card, Chip, Divider, Ellipsis, Press, Row, Stack } from "../ui/base";
import { Button, SearchField, Segmented } from "../ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "../ui/feedback";
import { Screen } from "../ui/Screen";
import { Sheet } from "../ui/Sheet";
import { SwipeRow } from "../ui/SwipeRow";

const PACKAGE_LABELS: Record<string, string> = {
  espresso: "Espresso — €890",
  reserve: "Reserve — €2.400",
  blend: "Blend Retainer — €1.200/mnd",
  custom: "Custom / nog niet zeker",
  automotive: "Automotive — €50/voertuig",
};

type Filter = "open" | "done" | "all";

/** Strips everything but digits and a leading +, for tel:/wa.me links. */
function normalisePhone(raw: string) {
  const trimmed = (raw || "").replace(/[^\d+]/g, "");
  if (!trimmed) return "";
  // wa.me refuses a leading +, and a Dutch 06… needs the country code.
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("0")) return `+31${trimmed.slice(1)}`;
  return trimmed;
}

export function InboxScreen() {
  const { inquiries, loading, error, refresh } = useAppData();
  const { handled, toggle, markHandled } = useHandled();
  const [params, setParams] = useSearchParams();

  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(params.get("open"));

  // Ad-click tracking writes synthetic inquiry rows; they are campaign data,
  // not leads, and belong in Ads rather than the inbox.
  const real = useMemo(() => inquiries.filter((q) => q.name !== AD_VISIT_MARKER), [inquiries]);

  const counts = useMemo(
    () => ({
      open: real.filter((q) => !handled.has(q.id)).length,
      done: real.filter((q) => handled.has(q.id)).length,
    }),
    [real, handled]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return real.filter((item) => {
      const isHandled = handled.has(item.id);
      if (filter === "open" && isHandled) return false;
      if (filter === "done" && !isHandled) return false;
      if (!q) return true;
      return [item.name, item.email, item.brand, item.message, item.phone].some((f) =>
        (f || "").toLowerCase().includes(q)
      );
    });
  }, [real, handled, filter, query]);

  const active = useMemo(() => real.find((q) => q.id === openId) ?? null, [real, openId]);

  // A deep link from Home lands on a specific inquiry; drop the param once
  // consumed so a later refresh doesn't reopen the sheet.
  useEffect(() => {
    if (params.get("open")) {
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  return (
    <Screen
      title="Inbox"
      eyebrow={`${counts.open} open · ${real.length} totaal`}
      onRefresh={refresh}
      hero={
        <Stack gap={12} style={{ marginBottom: 18 }}>
          <SearchField value={query} onChange={setQuery} placeholder="Naam, merk of bericht" />
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v)}
            options={[
              { value: "open", label: "Open", badge: counts.open },
              { value: "done", label: "Afgehandeld", badge: counts.done },
              { value: "all", label: "Alles" },
            ]}
          />
        </Stack>
      }
    >
      {loading && !real.length ? (
        <SkeletonList rows={5} height={78} />
      ) : error && !real.length ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : visible.length === 0 ? (
        <Empty
          icon={<Inbox size={22} />}
          title={
            query ? "Niets gevonden" : filter === "open" ? "Alles afgehandeld" : "Nog geen aanvragen"
          }
          body={
            query
              ? `Geen aanvraag komt overeen met “${query}”.`
              : filter === "open"
                ? "Er staan geen openstaande aanvragen meer. Mooi werk."
                : "Aanvragen via het contactformulier komen hier binnen."
          }
        />
      ) : (
        <Stack gap={9}>
          {visible.map((item, i) => {
            const isHandled = handled.has(item.id);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.smooth, delay: Math.min(i, 9) * 0.03 }}
              >
                <SwipeRow
                  actions={[
                    {
                      label: isHandled ? "Heropen" : "Klaar",
                      icon: isHandled ? <Undo2 size={17} /> : <Check size={17} />,
                      onClick: () => toggle(item.id),
                      tone: isHandled ? c.warn : c.ok,
                      // Safe as a full-swipe: it flips a local flag and the
                      // opposite swipe puts it straight back.
                      full: true,
                    },
                  ]}
                >
                  <InquiryRow
                    inquiry={item}
                    handled={isHandled}
                    onClick={() => setOpenId(item.id)}
                  />
                </SwipeRow>
              </motion.div>
            );
          })}
        </Stack>
      )}

      <InquirySheet
        inquiry={active}
        handled={active ? handled.has(active.id) : false}
        onClose={() => setOpenId(null)}
        onToggleHandled={() => active && toggle(active.id)}
        onMarkHandled={() => active && markHandled(active.id)}
      />
    </Screen>
  );
}

function InquiryRow({
  inquiry,
  handled,
  onClick,
}: {
  inquiry: Inquiry;
  handled: boolean;
  onClick: () => void;
}) {
  const hoursOld = (Date.now() - new Date(inquiry.createdAt).getTime()) / 3600000;
  const urgent = !handled && hoursOld >= 48;
  const fresh = !handled && hoursOld < 4;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        border: "none",
        padding: 0,
        background: "none",
        textAlign: "left",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <Card style={{ padding: 14, opacity: handled ? 0.58 : 1 }}>
        <Row gap={12} align="flex-start">
          <Avatar
            name={inquiry.name}
            size={40}
            tone={handled ? "neutral" : urgent ? "danger" : fresh ? "ok" : "warn"}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Row gap={8} style={{ justifyContent: "space-between" }}>
              <Ellipsis
                style={{
                  fontSize: 14.5,
                  fontWeight: 650,
                  color: c.fg,
                  textDecoration: handled ? "line-through" : "none",
                  textDecorationColor: c.fg4,
                }}
              >
                {inquiry.name}
              </Ellipsis>
              <span style={{ fontSize: 10.5, color: c.fg4, fontWeight: 600, flexShrink: 0 }}>
                {timeAgo(inquiry.createdAt)}
              </span>
            </Row>

            {inquiry.brand && (
              <Ellipsis style={{ fontSize: 12, color: c.fg3, marginTop: 2 }}>
                {inquiry.brand}
              </Ellipsis>
            )}

            <div
              style={{
                fontSize: 12.5,
                color: c.fg3,
                marginTop: 6,
                lineHeight: 1.45,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {inquiry.message || "Geen bericht"}
            </div>

            <Row gap={7} style={{ marginTop: 9, flexWrap: "wrap" }}>
              {inquiry.package && (
                <Chip tone="copper">{PACKAGE_LABELS[inquiry.package] ?? inquiry.package}</Chip>
              )}
              {urgent && <Chip tone="danger">48u+</Chip>}
              {fresh && <Chip tone="ok">Nieuw</Chip>}
              {handled && <Chip tone="neutral">Klaar</Chip>}
            </Row>
          </div>
        </Row>
      </Card>
    </button>
  );
}

function InquirySheet({
  inquiry,
  handled,
  onClose,
  onToggleHandled,
  onMarkHandled,
}: {
  inquiry: Inquiry | null;
  handled: boolean;
  onClose: () => void;
  onToggleHandled: () => void;
  onMarkHandled: () => void;
}) {
  const toast = useToast();
  const phone = normalisePhone(inquiry?.phone ?? "");

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      haptic("success");
      toast(`${what} gekopieerd`, "success");
    } catch {
      toast("Kopiëren lukte niet", "error");
    }
  }

  /**
   * Opening mail/phone/WhatsApp is the moment the lead is actually being
   * worked, so it doubles as the "afgehandeld" signal — one less thing to
   * remember to tap afterwards.
   */
  function contactVia(href: string) {
    onMarkHandled();
    window.location.href = href;
  }

  return (
    <Sheet
      open={!!inquiry}
      onClose={onClose}
      title={inquiry?.name}
      subtitle={inquiry ? dateFull(inquiry.createdAt) : undefined}
      footer={
        inquiry ? (
          <Button
            full
            variant={handled ? "ghost" : "primary"}
            icon={handled ? <Undo2 size={16} /> : <Check size={16} />}
            onClick={() => {
              onToggleHandled();
              onClose();
            }}
          >
            {handled ? "Markeer als open" : "Markeer afgehandeld"}
          </Button>
        ) : undefined
      }
    >
      {inquiry && (
        <Stack gap={16}>
          {inquiry.package && (
            <Row gap={8} style={{ flexWrap: "wrap" }}>
              <Chip tone="copper">{PACKAGE_LABELS[inquiry.package] ?? inquiry.package}</Chip>
              {inquiry.brand && <Chip tone="neutral">{inquiry.brand}</Chip>}
            </Row>
          )}

          {/* Contact actions */}
          <Row gap={8}>
            <ContactAction
              icon={<Mail size={17} />}
              label="Mail"
              onClick={() => contactVia(`mailto:${inquiry.email}`)}
            />
            <ContactAction
              icon={<Phone size={17} />}
              label="Bellen"
              disabled={!phone}
              onClick={() => contactVia(`tel:${phone}`)}
            />
            <ContactAction
              icon={<MessageCircle size={17} />}
              label="WhatsApp"
              disabled={!phone}
              onClick={() => contactVia(`https://wa.me/${phone.replace("+", "")}`)}
            />
          </Row>

          <Card padded={false} style={{ padding: 14 }}>
            <Stack gap={12}>
              <DetailRow label="E-mail" value={inquiry.email} onCopy={() => copy(inquiry.email, "E-mailadres")} />
              {inquiry.phone && (
                <>
                  <Divider />
                  <DetailRow
                    label="Telefoon"
                    value={inquiry.phone}
                    onCopy={() => copy(inquiry.phone, "Telefoonnummer")}
                  />
                </>
              )}
              {inquiry.brand && (
                <>
                  <Divider />
                  <DetailRow label="Merk / bedrijf" value={inquiry.brand} />
                </>
              )}
            </Stack>
          </Card>

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: c.fg4,
                marginBottom: 8,
              }}
            >
              Bericht
            </div>
            <Card
              className="m-selectable"
              style={{
                padding: 15,
                fontSize: 14,
                lineHeight: 1.6,
                color: c.fg2,
                whiteSpace: "pre-wrap",
              }}
            >
              {inquiry.message || "Geen bericht meegestuurd."}
            </Card>
          </div>
        </Stack>
      )}
    </Sheet>
  );
}

function ContactAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Press
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 66,
        borderRadius: radius.md,
        backgroundColor: c.surface2,
        border: `1px solid ${c.line}`,
        color: c.fg,
      }}
    >
      <span style={{ color: c.copper }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 650 }}>{label}</span>
    </Press>
  );
}

function DetailRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <Row gap={10}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: c.fg4, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          {label}
        </div>
        <Ellipsis className="m-selectable" style={{ fontSize: 14, color: c.fg, marginTop: 3 }}>
          {value}
        </Ellipsis>
      </div>
      {onCopy && (
        <Press
          onClick={onCopy}
          aria-label={`${label} kopiëren`}
          style={{ width: 40, height: 40, display: "grid", placeItems: "center", color: c.fg3 }}
        >
          <Copy size={15} />
        </Press>
      )}
    </Row>
  );
}
