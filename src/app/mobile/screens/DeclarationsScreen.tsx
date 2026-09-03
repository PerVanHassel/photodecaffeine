import { motion } from "motion/react";
import { FileText, Paperclip, Plus, Receipt, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useApi, useQuery } from "../useApi";
import { BUCKETS, type Declaration } from "../api";
import { c, dateShort, euro, radius, spring } from "../theme";
import { Card, Chip, Ellipsis, Press, Row, SectionLabel, Stack } from "../ui/base";
import { BarBreakdown } from "../ui/data";
import { Button, Field, FilePicker, Input, Select } from "../ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "../ui/feedback";
import { HeaderAction, Screen } from "../ui/Screen";
import { ConfirmSheet, Sheet } from "../ui/Sheet";
import { SwipeRow } from "../ui/SwipeRow";

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
 * Same keyword table the desktop declarations page uses to pre-pick a category
 * from the description. Kept here rather than shared because it is a UX nicety
 * with no correctness consequence — a wrong guess costs one tap.
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

export function DeclarationsScreen() {
  const api = useApi();
  const [params, setParams] = useSearchParams();

  const [quarter, setQuarter] = useState<string>(quarterOf(new Date()));
  const [composing, setComposing] = useState(params.get("new") === "1");
  const [pendingDelete, setPendingDelete] = useState<Declaration | null>(null);
  const [detail, setDetail] = useState<Declaration | null>(null);

  const toast = useToast();
  const query = useQuery(() => api.declarations({ quarter }), [api, quarter]);

  useEffect(() => {
    if (params.get("new")) setParams({}, { replace: true });
  }, [params, setParams]);

  const declarations = query.data?.declarations ?? [];
  const totals = query.data?.totals;

  const byCategory = useMemo(() => {
    const entries = Object.entries(totals?.byCategory ?? {});
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [totals]);

  async function remove(target: Declaration) {
    const before = query.data;
    query.set((prev) =>
      prev
        ? { ...prev, declarations: prev.declarations.filter((d) => d.id !== target.id) }
        : prev!
    );
    try {
      await api.deleteDeclaration(target.id);
      toast("Declaratie verwijderd", "success");
      // Totals are computed server-side, so re-read rather than recomputing
      // them here and risking a number that disagrees with the export.
      query.refresh();
    } catch (err) {
      if (before) query.set(before);
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
    setPendingDelete(null);
  }

  return (
    <Screen
      title="Declaraties"
      eyebrow={quarter.replace("-", " · ")}
      back="/app/more"
      fullBleedBottom
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      trailing={
        <HeaderAction
          label="Nieuwe declaratie"
          icon={<Plus size={21} />}
          tone={c.copper}
          onClick={() => setComposing(true)}
        />
      }
      hero={
        <div
          className="m-hscroll"
          style={{ gap: 8, marginLeft: -18, marginRight: -18, padding: "2px 18px 18px" }}
        >
          {recentQuarters().map((q) => {
            const active = q === quarter;
            return (
              <Press
                key={q}
                onClick={() => setQuarter(q)}
                feedback="select"
                style={{
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  padding: "9px 16px",
                  borderRadius: radius.pill,
                  border: `1px solid ${active ? c.copper : c.line}`,
                  backgroundColor: active ? c.copperWash : c.surface,
                  color: active ? c.copper : c.fg3,
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {q.replace("-", " ")}
              </Press>
            );
          })}
        </div>
      }
    >
      {query.loading ? (
        <SkeletonList rows={5} />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refresh} />
      ) : (
        <Stack gap={26}>
          {/* Totals */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring.smooth}>
            <Card style={{ padding: 18 }}>
              <Row gap={16}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: c.fg4,
                    }}
                  >
                    Totaal
                  </div>
                  <div
                    className="m-num"
                    style={{ fontSize: 26, fontWeight: 700, color: c.fg, marginTop: 4 }}
                  >
                    {euro(totals?.amount ?? 0)}
                  </div>
                </div>
                <div style={{ width: 1, alignSelf: "stretch", backgroundColor: c.line }} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: c.fg4,
                    }}
                  >
                    BTW terug
                  </div>
                  <div
                    className="m-num"
                    style={{ fontSize: 26, fontWeight: 700, color: c.copper, marginTop: 4 }}
                  >
                    {euro(totals?.vatAmount ?? 0)}
                  </div>
                </div>
              </Row>
              <div style={{ fontSize: 11.5, color: c.fg4, marginTop: 12 }}>
                {totals?.count ?? 0} declaratie{(totals?.count ?? 0) === 1 ? "" : "s"} in dit kwartaal
              </div>
            </Card>
          </motion.div>

          {byCategory.length > 0 && (
            <section>
              <SectionLabel>Per categorie</SectionLabel>
              <Card style={{ padding: 16 }}>
                <BarBreakdown items={byCategory} formatValue={(n) => euro(n, 0)} />
              </Card>
            </section>
          )}

          <section>
            <SectionLabel>Alle declaraties</SectionLabel>
            {declarations.length === 0 ? (
              <Empty
                icon={<Receipt size={22} />}
                title="Nog niets ingediend"
                body="Voeg een bon toe zodra je een uitgave doet — dat scheelt zoeken aan het eind van het kwartaal."
                action={{ label: "Declaratie toevoegen", onClick: () => setComposing(true) }}
              />
            ) : (
              <Stack gap={9}>
                {declarations.map((d, i) => (
                  <motion.div
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.smooth, delay: Math.min(i, 9) * 0.03 }}
                  >
                    <SwipeRow
                      actions={[
                        {
                          label: "Verwijder",
                          icon: <Trash2 size={17} />,
                          onClick: () => setPendingDelete(d),
                          tone: c.danger,
                        },
                      ]}
                    >
                      <button
                        type="button"
                        onClick={() => setDetail(d)}
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
                              <Ellipsis style={{ fontSize: 14, fontWeight: 650, color: c.fg }}>
                                {d.description || d.category}
                              </Ellipsis>
                              <Row gap={7} style={{ marginTop: 7, flexWrap: "wrap" }}>
                                <Chip tone="neutral">{d.category}</Chip>
                                <span style={{ fontSize: 10.5, color: c.fg4, fontWeight: 600 }}>
                                  {dateShort(d.date)}
                                </span>
                                {d.receiptUrl && <Paperclip size={11} color={c.fg4} />}
                              </Row>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div
                                className="m-num"
                                style={{ fontSize: 15, fontWeight: 700, color: c.fg }}
                              >
                                {euro(d.amount)}
                              </div>
                              <div style={{ fontSize: 10.5, color: c.copper, marginTop: 3, fontWeight: 600 }}>
                                {euro(d.vatAmount)} btw
                              </div>
                            </div>
                          </Row>
                        </Card>
                      </button>
                    </SwipeRow>
                  </motion.div>
                ))}
              </Stack>
            )}
          </section>
        </Stack>
      )}

      <ComposeDeclarationSheet
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
              <Row style={{ justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: c.fg3 }}>Bedrag incl. btw</span>
                <span className="m-num" style={{ fontSize: 15, fontWeight: 700, color: c.fg }}>
                  {euro(declaration.amount)}
                </span>
              </Row>
              <Row style={{ justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: c.fg3 }}>Btw-tarief</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: c.fg }}>
                  {declaration.vatRate}%
                </span>
              </Row>
              <Row style={{ justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: c.fg3 }}>Terug te vorderen</span>
                <span className="m-num" style={{ fontSize: 15, fontWeight: 700, color: c.copper }}>
                  {euro(declaration.vatAmount)}
                </span>
              </Row>
              <Row style={{ justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: c.fg3 }}>Ingediend door</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: c.fg }}>
                  {declaration.submittedBy?.name || declaration.adminName}
                </span>
              </Row>
            </Stack>
          </Card>

          {declaration.receiptUrl && (
            <Button
              full
              variant="secondary"
              icon={<FileText size={16} />}
              onClick={() => window.open(declaration.receiptUrl, "_blank", "noopener")}
            >
              Bon openen
            </Button>
          )}
        </Stack>
      )}
    </Sheet>
  );
}

function ComposeDeclarationSheet({
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

  async function uploadReceipt(files: File[]) {
    setUploading(true);
    try {
      const url = await api.upload(files[0], BUCKETS.declarations);
      setReceiptUrl(url);
      toast("Bon toegevoegd", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload mislukt", "error");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
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
        <Button full busy={busy} onClick={submit}>
          Indienen
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Bedrag incl. btw">
          <Input
            // "decimal" rather than "numeric" so the iOS keypad shows a comma.
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            autoFocus
            style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}
          />
        </Field>

        <Field label="Omschrijving" hint="Bepaalt de voorgestelde categorie">
          <Input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (!categoryTouched) setCategory(suggestCategory(e.target.value));
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
            options={CATEGORIES.map((c2) => ({ value: c2, label: c2 }))}
          />
        </Field>

        <Row gap={10}>
          <div style={{ flex: 1 }}>
            <Field label="Datum">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Btw">
              <Select value={vatRate} onChange={setVatRate} options={VAT_RATES} />
            </Field>
          </div>
        </Row>

        <Field label="Bon" hint={receiptUrl ? "Bon toegevoegd" : "Foto of PDF, optioneel"}>
          <FilePicker
            onFiles={uploadReceipt}
            accept="image/*,application/pdf"
            busy={uploading}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 52,
                borderRadius: radius.md,
                border: `1px dashed ${receiptUrl ? c.ok : c.line2}`,
                color: receiptUrl ? c.ok : c.fg3,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <Paperclip size={15} />
              {uploading ? "Uploaden…" : receiptUrl ? "Bon toegevoegd" : "Bon toevoegen"}
            </div>
          </FilePicker>
        </Field>
      </Stack>
    </Sheet>
  );
}
