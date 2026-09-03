import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { AD_VISIT_MARKER } from "@shared/actionItems";
import { useAppData } from "@/AppData";
import { useHandled } from "@/useHandled";
import type { Inquiry } from "@/api";
import { useColors } from "@/ThemeContext";
import { dateFull, radius, timeAgo } from "@/theme";
import { PACKAGE_LABELS } from "@/projectStatus";
import { Avatar, Card, Chip, Divider, haptic, Press, Row, Stack, Txt } from "@/ui/base";
import { Button, SearchField, Segmented } from "@/ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "@/ui/feedback";
import { Screen } from "@/ui/Screen";
import { Sheet } from "@/ui/Sheet";
import { SwipeRow } from "@/ui/SwipeRow";

type Filter = "open" | "done" | "all";

/** Strips everything but digits and a leading +, for tel: and wa.me links. */
function normalisePhone(raw: string) {
  const trimmed = (raw || "").replace(/[^\d+]/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  // A Dutch 06… needs the country code before WhatsApp will accept it.
  if (trimmed.startsWith("0")) return `+31${trimmed.slice(1)}`;
  return trimmed;
}

export default function InboxScreen() {
  const c = useColors();
  const { inquiries, loading, error, refresh } = useAppData();
  const { handled, toggle, markHandled } = useHandled();
  const params = useLocalSearchParams<{ open?: string }>();

  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Deep link from Home lands on one specific inquiry.
  useEffect(() => {
    if (params.open) setOpenId(params.open);
  }, [params.open]);

  // Ad-click tracking writes synthetic inquiry rows; they are campaign data,
  // not leads, and belong in Advertenties rather than the inbox.
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

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <Screen
      title="Inbox"
      eyebrow={`${counts.open} open · ${real.length} totaal`}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      hero={
        <Stack gap={12} style={{ marginBottom: 18 }}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Naam, merk of bericht" />
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v)}
            options={[
              { value: "open", label: "Open", badge: counts.open },
              { value: "done", label: "Klaar", badge: counts.done },
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
          icon="inbox"
          title={query ? "Niets gevonden" : filter === "open" ? "Alles afgehandeld" : "Nog geen aanvragen"}
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
              <Animated.View
                key={item.id}
                layout={LinearTransition.springify().damping(22)}
                entering={FadeInDown.delay(Math.min(i, 9) * 30).springify().damping(20)}
              >
                <SwipeRow
                  actions={[
                    {
                      label: isHandled ? "Heropen" : "Klaar",
                      icon: isHandled ? "rotate-ccw" : "check",
                      onPress: () => toggle(item.id),
                      tone: isHandled ? c.warn : c.ok,
                    },
                  ]}
                >
                  <Press onPress={() => setOpenId(item.id)} scale={0.985}>
                    <InquiryRow inquiry={item} handled={isHandled} />
                  </Press>
                </SwipeRow>
              </Animated.View>
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

function InquiryRow({ inquiry, handled }: { inquiry: Inquiry; handled: boolean }) {
  const c = useColors();
  const hoursOld = (Date.now() - new Date(inquiry.createdAt).getTime()) / 3600000;
  const urgent = !handled && hoursOld >= 48;
  const fresh = !handled && hoursOld < 4;

  return (
    <Card style={{ padding: 14, opacity: handled ? 0.58 : 1 }}>
      <Row gap={12} align="flex-start">
        <Avatar
          name={inquiry.name}
          size={40}
          tone={handled ? "neutral" : urgent ? "danger" : fresh ? "ok" : "warn"}
        />
        <View style={{ flex: 1 }}>
          <Row gap={8} style={{ justifyContent: "space-between" }}>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 14.5,
                fontWeight: "600",
                color: c.fg,
                textDecorationLine: handled ? "line-through" : "none",
              }}
            >
              {inquiry.name}
            </Text>
            <Txt variant="meta" style={{ fontSize: 10.5, color: c.fg4 }}>
              {timeAgo(inquiry.createdAt)}
            </Txt>
          </Row>

          {!!inquiry.brand && (
            <Txt variant="meta" numberOfLines={1} style={{ marginTop: 2 }}>
              {inquiry.brand}
            </Txt>
          )}

          <Txt variant="body" numberOfLines={2} style={{ fontSize: 12.5, marginTop: 6, lineHeight: 18 }}>
            {inquiry.message || "Geen bericht"}
          </Txt>

          <Row gap={7} style={{ marginTop: 9, flexWrap: "wrap" }}>
            {!!inquiry.package && (
              <Chip tone="copper">{PACKAGE_LABELS[inquiry.package] ?? inquiry.package}</Chip>
            )}
            {urgent && <Chip tone="danger">48u+</Chip>}
            {fresh && <Chip tone="ok">Nieuw</Chip>}
            {handled && <Chip tone="neutral">Klaar</Chip>}
          </Row>
        </View>
      </Row>
    </Card>
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
  const c = useColors();
  const toast = useToast();
  const phone = normalisePhone(inquiry?.phone ?? "");

  async function copy(value: string, what: string) {
    await Clipboard.setStringAsync(value);
    haptic("success");
    toast(`${what} gekopieerd`, "success");
  }

  /**
   * Opening mail, phone or WhatsApp is the moment the lead is actually being
   * worked, so it doubles as the "afgehandeld" signal — one less thing to
   * remember afterwards.
   */
  async function contactVia(url: string) {
    onMarkHandled();
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (!ok) {
      toast("Geen app gevonden om dit te openen", "error");
      return;
    }
    Linking.openURL(url);
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
            icon={handled ? "rotate-ccw" : "check"}
            onPress={() => {
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
          {!!inquiry.package && (
            <Row gap={8} style={{ flexWrap: "wrap" }}>
              <Chip tone="copper">{PACKAGE_LABELS[inquiry.package] ?? inquiry.package}</Chip>
              {!!inquiry.brand && <Chip tone="neutral">{inquiry.brand}</Chip>}
            </Row>
          )}

          <Row gap={8} align="stretch">
            <ContactAction
              icon="mail"
              label="Mail"
              onPress={() => contactVia(`mailto:${inquiry.email}`)}
            />
            <ContactAction
              icon="phone"
              label="Bellen"
              disabled={!phone}
              onPress={() => contactVia(`tel:${phone}`)}
            />
            <ContactAction
              icon="message-circle"
              label="WhatsApp"
              disabled={!phone}
              onPress={() => contactVia(`https://wa.me/${phone.replace("+", "")}`)}
            />
          </Row>

          <Card style={{ padding: 14 }}>
            <Stack gap={12}>
              <DetailRow
                label="E-mail"
                value={inquiry.email}
                onCopy={() => copy(inquiry.email, "E-mailadres")}
              />
              {!!inquiry.phone && (
                <>
                  <Divider />
                  <DetailRow
                    label="Telefoon"
                    value={inquiry.phone}
                    onCopy={() => copy(inquiry.phone, "Telefoonnummer")}
                  />
                </>
              )}
              {!!inquiry.brand && (
                <>
                  <Divider />
                  <DetailRow label="Merk / bedrijf" value={inquiry.brand} />
                </>
              )}
            </Stack>
          </Card>

          <View>
            <Txt variant="eyebrow" style={{ marginBottom: 8 }}>
              Bericht
            </Txt>
            <Card style={{ padding: 15 }}>
              <Text selectable style={{ fontSize: 14, lineHeight: 22, color: c.fg2 }}>
                {inquiry.message || "Geen bericht meegestuurd."}
              </Text>
            </Card>
          </View>
        </Stack>
      )}
    </Sheet>
  );
}

function ContactAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 68,
        borderRadius: radius.md,
        backgroundColor: c.surface2,
        borderWidth: 1,
        borderColor: c.line,
      }}
    >
      <Feather name={icon} size={17} color={c.copper} />
      <Text style={{ fontSize: 11, fontWeight: "600", color: c.fg }}>{label}</Text>
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
  const c = useColors();
  return (
    <Row gap={10}>
      <View style={{ flex: 1 }}>
        <Txt variant="eyebrow" style={{ fontSize: 9.5, letterSpacing: 1.6 }}>
          {label}
        </Txt>
        <Text selectable numberOfLines={1} style={{ fontSize: 14, color: c.fg, marginTop: 3 }}>
          {value}
        </Text>
      </View>
      {onCopy && (
        <Press
          onPress={onCopy}
          accessibilityLabel={`${label} kopiëren`}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="copy" size={15} color={c.fg3} />
        </Press>
      )}
    </Row>
  );
}
