import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useApi, useQuery } from "@/useApi";
import { BUCKETS, type Declaration } from "@/api";
import { pickReceipt } from "@/pickers";
import { useColors } from "@/ThemeContext";
import { dateShort, euro, GUTTER, radius } from "@/theme";
import { Card, Chip, Press, Row, SectionLabel, Stack, Txt } from "@/ui/base";
import { BarBreakdown } from "@/ui/data";
import { Button, Field, Input, PickTarget, Select } from "@/ui/form";
import { DateField } from "@/ui/DateField";
import { Empty, ErrorState, SkeletonList, useToast } from "@/ui/feedback";
import { HeaderAction, Screen } from "@/ui/Screen";
import { ConfirmSheet, Sheet } from "@/ui/Sheet";
import { SwipeRow } from "@/ui/SwipeRow";

const CATEGORIES = [
  "Reiskosten",
  "Apparatuur",
  "Software & Abonnementen",
  "Kantoorbenodigdheden",
  "Marketing & Advertenties",
  "Verzekeringen",
  "Horeca & Representatie",
  "Opleiding",
  "Overig",
];

const VAT_RATES = [
  { value: "21", label: "21% — algemeen tarief" },
  { value: "9", label: "9% — verlaagd tarief" },
  { value: "0", label: "0% / vrijgesteld" },
];

/**
 * Same keyword table the website's declarations page uses to pre-pick a
 * category from the description. Kept local rather than shared: it is a
 * convenience with no correctness consequence — a wrong guess costs one tap.
 */
const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["Reiskosten", ["benzine", "tank", "ns.nl", "trein", "taxi", "uber", "parkeren", "kilometer", "km "]],
  ["Apparatuur", ["camera", "lens", "statief", "licht", "drone", "gopro", "sd-kaart", "geheugenkaart", "accu", "batterij"]],
  ["Software & Abonnementen", ["adobe", "notion", "canva", "hosting", "domein", "software", "abonnement", "licentie", "dropbox", "icloud", "resend", "vercel", "supabase"]],
  ["Kantoorbenodigdheden", ["printer", "papier", "pen", "kantoor", "toner", "postzegel"]],
  ["Marketing & Advertenties", ["advertentie", "ads", "marketing", "flyer", "sponsor"]],
  ["Verzekeringen", ["verzekering", "premie", "aansprakelijkheid"]],
  ["Horeca & Representatie", ["lunch", "diner", "koffie", "restaurant", "borrel", "cadeau"]],
  ["Opleiding", ["cursus", "training", "workshop", "opleiding", "masterclass"]],
];

function suggestCategory(text: string) {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return "Overig";
}

function quarterOf(date: Date) {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

/** This quarter plus the three before it — enough for a VAT return. */
function recentQuarters(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 4; i++) {
    out.push(quarterOf(d));
    d.setMonth(d.getMonth() - 3);
  }
  return out;
}

export default function DeclarationsScreen() {
  const c = useColors();
  const api = useApi();
  const toast = useToast();
  const params = useLocalSearchParams<{ new?: string }>();

  const [quarter, setQuarter] = useState(quarterOf(new Date()));
  const [composing, setComposing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Declaration | null>(null);
  const [detail, setDetail] = useState<Declaration | null>(null);

  const query = useQuery(() => api.declarations({ quarter }), [api, quarter]);

  useEffect(() => {
    if (params.new === "1") setComposing(true);
  }, [params.new]);

  const declarations = query.data?.declarations ?? [];
  const totals = query.data?.totals;

  const byCategory = useMemo(
    () =>
      Object.entries(totals?.byCategory ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, value]) => ({ label, value })),
    [totals]
  );

  async function remove(target: Declaration) {
    const before = query.data;
    query.set((prev) =>
      prev ? { ...prev, declarations: prev.declarations.filter((d) => d.id !== target.id) } : prev!
    );
    setPendingDelete(null);
    try {
      await api.deleteDeclaration(target.id);
      toast("Declaratie verwijderd", "success");
      // Totals are computed server-side; re-read rather than recomputing them
      // here and risking a number that disagrees with the export.
      query.refresh();
    } catch (err) {
      if (before) query.set(before);
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
  }

  return (
    <Screen
      title="Declaraties"
      eyebrow={quarter.replace("-", " · ")}
      back
      fullBleedBottom
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      trailing={
        <HeaderAction label="Nieuwe declaratie" icon="plus" onPress={() => setComposing(true)} />
      }
      hero={
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: GUTTER }}
          style={{ marginHorizontal: -GUTTER, marginBottom: 18 }}
        >
          {recentQuarters().map((q) => {
            const active = q === quarter;
            return (
              <Press
                key={q}
                feedback="select"
                onPress={() => setQuarter(q)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: radius.pill,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: active ? c.copper : c.line,
                  backgroundColor: active ? c.copperWash : c.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: active ? "700" : "500",
                    color: active ? c.copper : c.fg3,
                  }}
                >
                  {q.replace("-", " ")}
                </Text>
              </Press>
            );
          })}
        </ScrollView>
      }
    >
      {query.loading ? (
        <SkeletonList rows={5} />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refresh} />
      ) : (
        <Stack gap={26}>
          <Animated.View entering={FadeInDown.springify().damping(20)}>
            <Card style={{ padding: 18 }}>
              <Row gap={16}>
                <View style={{ flex: 1 }}>
                  <Txt variant="eyebrow">Totaal</Txt>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "700",
                      color: c.fg,
                      marginTop: 4,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {euro(totals?.amount ?? 0)}
                  </Text>
                </View>
                <View
                  style={{ width: StyleSheet.hairlineWidth * 2, alignSelf: "stretch", backgroundColor: c.line }}
                />
                <View style={{ flex: 1 }}>
                  <Txt variant="eyebrow">Btw terug</Txt>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "700",
                      color: c.copper,
                      marginTop: 4,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {euro(totals?.vatAmount ?? 0)}
                  </Text>
                </View>
              </Row>
              <Txt variant="meta" style={{ marginTop: 12, fontSize: 11.5 }}>
                {`${totals?.count ?? 0} declaratie${(totals?.count ?? 0) === 1 ? "" : "s"} in dit kwartaal`}
              </Txt>
            </Card>
          </Animated.View>

          {byCategory.length > 0 && (
            <View>
              <SectionLabel>Per categorie</SectionLabel>
              <Card style={{ padding: 16 }}>
                <BarBreakdown items={byCategory} formatValue={(n) => euro(n, 0)} />
              </Card>
            </View>
          )}

          <View>
            <SectionLabel>Alle declaraties</SectionLabel>
            {declarations.length === 0 ? (
              <Empty
                icon="file-text"
                title="Nog niets ingediend"
                body="Voeg een bon toe zodra je een uitgave doet — dat scheelt zoeken aan het eind van het kwartaal."
                action={{ label: "Declaratie toevoegen", onPress: () => setComposing(true) }}
              />
            ) : (
              <Stack gap={9}>
                {declarations.map((d, i) => (
                  <Animated.View
                    key={d.id}
                    layout={LinearTransition.springify().damping(22)}
                    entering={FadeInDown.delay(Math.min(i, 9) * 30).springify().damping(20)}
                  >
                    <SwipeRow
                      actions={[
                        {
                          label: "Verwijder",
                          icon: "trash-2",
                          onPress: () => setPendingDelete(d),
                          tone: c.danger,
                        },
                      ]}
                    >
                      <Press onPress={() => setDetail(d)} scale={0.985}>
                        <Card style={{ padding: 14 }}>
                          <Row gap={12} align="flex-start">
                            <View style={{ flex: 1 }}>
                              <Text
                                numberOfLines={1}
                                style={{ fontSize: 14, fontWeight: "600", color: c.fg }}
                              >
                                {d.description || d.category}
                              </Text>
                              <Row gap={7} style={{ marginTop: 7, flexWrap: "wrap" }}>
                                <Chip tone="neutral">{d.category}</Chip>
                                <Txt variant="meta" style={{ fontSize: 10.5, color: c.fg4 }}>
                                  {dateShort(d.date)}
                                </Txt>
                                {!!d.receiptUrl && (
                                  <Feather name="paperclip" size={11} color={c.fg4} />
                                )}
                              </Row>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text
                                style={{
                                  fontSize: 15,
                                  fontWeight: "700",
                                  color: c.fg,
                                  fontVariant: ["tabular-nums"],
                                }}
                              >
                                {euro(d.amount)}
                              </Text>
                              <Txt variant="meta" style={{ fontSize: 10.5, color: c.copper, marginTop: 3 }}>
                                {`${euro(d.vatAmount)} btw`}
                              </Txt>
                            </View>
                          </Row>
                        </Card>
                      </Press>
                    </SwipeRow>
                  </Animated.View>
                ))}
              </Stack>
            )}
          </View>
        </Stack>
      )}

      <ComposeSheet
        open={composing}
        onClose={() => setComposing(false)}
        onCreated={() => {
          setComposing(false);
          query.refresh();
        }}
      />

      <DetailSheet declaration={detail} onClose={() => setDetail(null)} />

      <ConfirmSheet
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title="Declaratie verwijderen?"
        body={
          pendingDelete
            ? `${pendingDelete.description || pendingDelete.category} — ${euro(pendingDelete.amount)}`
            : undefined
        }
      />
    </Screen>
  );
}

function DetailSheet({
  declaration,
  onClose,
}: {
  declaration: Declaration | null;
  onClose: () => void;
}) {
  const c = useColors();
  return (
    <Sheet
      open={!!declaration}
      onClose={onClose}
      title={declaration?.description || declaration?.category}
      subtitle={declaration ? dateShort(declaration.date) : undefined}
    >
      {declaration && (
        <Stack gap={14} style={{ paddingBottom: 8 }}>
          <Card style={{ padding: 16 }}>
            <Stack gap={12}>
              <DetailLine label="Bedrag incl. btw" value={euro(declaration.amount)} />
              <DetailLine label="Btw-tarief" value={`${declaration.vatRate}%`} />
              <DetailLine
                label="Terug te vorderen"
                value={euro(declaration.vatAmount)}
                tone={c.copper}
              />
              <DetailLine
                label="Ingediend door"
                value={declaration.submittedBy?.name || declaration.adminName}
              />
            </Stack>
          </Card>

          {!!declaration.receiptUrl && (
            <Button
              full
              variant="secondary"
              icon="file-text"
              onPress={() => Linking.openURL(declaration.receiptUrl)}
            >
              Bon openen
            </Button>
          )}
        </Stack>
      )}
    </Sheet>
  );
}

function DetailLine({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const c = useColors();
  return (
    <Row style={{ justifyContent: "space-between" }} gap={12}>
      <Txt variant="body" style={{ fontSize: 13, color: c.fg3 }}>
        {label}
      </Txt>
      <Text
        style={{
          fontSize: 14.5,
          fontWeight: "700",
          color: tone ?? c.fg,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </Row>
  );
}

function ComposeSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const api = useApi();
  const toast = useToast();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("Overig");
  const [description, setDescription] = useState("");
  const [vatRate, setVatRate] = useState("21");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  // Once the category is picked by hand, stop second-guessing it.
  const [categoryTouched, setCategoryTouched] = useState(false);

  function reset() {
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setCategory("Overig");
    setDescription("");
    setVatRate("21");
    setReceiptUrl("");
    setCategoryTouched(false);
  }

  async function uploadReceipt() {
    let asset;
    try {
      asset = await pickReceipt();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Kon bestand niet openen", "error");
      return;
    }
    if (!asset) return;

    setUploading(true);
    try {
      setReceiptUrl(await api.upload(asset, BUCKETS.declarations));
      toast("Bon toegevoegd", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload mislukt", "error");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    // Dutch keyboards produce a comma; the API wants a number.
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0) {
      toast("Vul een geldig bedrag in", "error");
      return;
    }
    setBusy(true);
    try {
      await api.createDeclaration({
        amount: value,
        date,
        category,
        description: description.trim(),
        receiptUrl,
        vatRate: Number(vatRate),
      });
      toast("Declaratie ingediend", "success");
      reset();
      onCreated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Opslaan mislukt", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nieuwe declaratie"
      footer={
        <Button full busy={busy} onPress={submit}>
          Indienen
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Bedrag incl. btw">
          <Input
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            keyboardType="decimal-pad"
            autoFocus
            style={{ fontSize: 22 }}
          />
        </Field>

        <Field label="Omschrijving" hint="Bepaalt de voorgestelde categorie">
          <Input
            value={description}
            onChangeText={(v) => {
              setDescription(v);
              if (!categoryTouched) setCategory(suggestCategory(v));
            }}
            placeholder="Bijv. Adobe abonnement september"
          />
        </Field>

        <Field label="Categorie">
          <Select
            value={category}
            onChange={(v) => {
              setCategory(v);
              setCategoryTouched(true);
            }}
            options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            title="Categorie"
          />
        </Field>

        <Row gap={10} align="flex-start">
          <View style={{ flex: 1 }}>
            <Field label="Datum">
              <DateField value={date} onChange={setDate} />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Btw">
              <Select value={vatRate} onChange={setVatRate} options={VAT_RATES} title="Btw-tarief" />
            </Field>
          </View>
        </Row>

        <Field label="Bon" hint={receiptUrl ? "Bon toegevoegd" : "Foto of PDF, optioneel"}>
          <PickTarget
            onPress={uploadReceipt}
            busy={uploading}
            icon="paperclip"
            label={receiptUrl ? "Bon toegevoegd" : "Bon toevoegen"}
            height={54}
            active={!!receiptUrl}
          />
        </Field>
      </Stack>
    </Sheet>
  );
}
