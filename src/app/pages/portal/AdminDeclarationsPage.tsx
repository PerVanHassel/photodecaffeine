import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, X, Check, AlertCircle, Paperclip, Edit2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { projectId } from "/utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e`;
const BUCKET = "declaration-files-0951c59e";

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

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["Reiskosten", ["benzine", "tank", "ns.nl", "trein", "taxi", "uber", "parkeren", "kilometer", "km "]],
  ["Apparatuur", ["camera", "lens", "statief", "licht", "drone", "gopro", "sd-kaart", "geheugenkaart", "accu", "batterij"]],
  ["Software & Abonnementen", ["adobe", "notion", "canva", "hosting", "domein", "software", "abonnement", "subscriptie", "licentie", "dropbox", "google drive", "icloud", "resend", "vercel", "supabase"]],
  ["Kantoorbenodigdheden", ["printer", "papier", "pen", "kantoor", "toner", "postzegel"]],
  ["Marketing & Advertenties", ["advertentie", "ads", "facebook ads", "instagram ads", "google ads", "marketing", "flyer", "sponsor"]],
  ["Verzekeringen", ["verzekering", "premie", "aansprakelijkheid"]],
  ["Horeca & Representatie", ["lunch", "diner", "koffie", "restaurant", "borrel", "cadeau", "representatie"]],
  ["Opleiding", ["cursus", "training", "workshop", "opleiding", "masterclass"]],
];

function suggestCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return "Overig";
}

function currentQuarter() {
  const now = new Date();
  return { year: now.getFullYear(), q: Math.floor(now.getMonth() / 3) + 1 };
}

function formatEUR(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

type Declaration = {
  id: string;
  adminId: string;
  adminName: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
  date: string;
  category: string;
  description: string;
  receiptUrl: string;
  submittedBy: { id: string; name: string };
  createdAt: string;
};

const VAT_RATES = [
  { value: "21", label: "21% (algemeen tarief)" },
  { value: "9", label: "9% (verlaagd tarief)" },
  { value: "0", label: "0% / vrijgesteld" },
];

type Worker = { id: string; name: string; email: string };

const labelStyle: React.CSSProperties = {
  color: "rgba(var(--admin-fg-rgb),0.6)",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "8px",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "rgba(var(--admin-bg-card-rgb),0.8)",
  border: "1px solid rgba(var(--admin-fg-rgb),0.15)",
  color: "var(--admin-fg-solid)",
  padding: "12px",
  fontSize: "14px",
  fontFamily: "'Inter', sans-serif",
  boxSizing: "border-box",
};

const emptyForm = { amount: "", vatRate: "21", date: new Date().toISOString().slice(0, 10), category: "", description: "", receiptUrl: "", adminId: "" };

export function AdminDeclarationsPage() {
  const { session, user } = useAuth();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [totals, setTotals] = useState<{ amount: number; vatAmount: number; count: number; byCategory: Record<string, number> }>({ amount: 0, vatAmount: 0, count: 0, byCategory: {} });
  const [canViewAll, setCanViewAll] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [year, setYear] = useState(currentQuarter().year);
  const [q, setQ] = useState(currentQuarter().q);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Declaration | null>(null);

  const quarterKey = `${year}-Q${q}`;

  useEffect(() => {
    if (session) {
      ensureBucket();
      fetchWorkers();
    }
  }, [session]);

  useEffect(() => {
    if (session) fetchDeclarations();
  }, [session, quarterKey, categoryFilter, adminFilter]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  async function ensureBucket() {
    try {
      await fetch(`${API}/admin/storage/ensure-bucket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session!.access_token}` },
        body: JSON.stringify({ bucketName: BUCKET }),
      });
    } catch {
      // Silently retry on upload
    }
  }

  async function fetchWorkers() {
    try {
      const res = await fetch(`${API}/admin/workers`, {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      const data = await res.json();
      setWorkers(data.workers || []);
    } catch (err) {
      console.error("Failed to fetch workers:", err);
    }
  }

  async function fetchDeclarations() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ quarter: quarterKey });
      if (categoryFilter) params.set("category", categoryFilter);
      if (adminFilter) params.set("adminId", adminFilter);
      const res = await fetch(`${API}/admin/declarations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      const data = await res.json();
      setDeclarations(data.declarations || []);
      setTotals(data.totals || { amount: 0, vatAmount: 0, count: 0, byCategory: {} });
      setCanViewAll(!!data.canViewAll);
    } catch (err) {
      console.error("Failed to fetch declarations:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucketName", BUCKET);
      const res = await fetch(`${API}/admin/storage/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload mislukt");
      setForm((prev) => ({ ...prev, receiptUrl: data.url }));
    } catch (err) {
      showToast(String(err instanceof Error ? err.message : err), "error");
    } finally {
      setUploading(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm, adminId: user?.id || "" });
    setCategoryTouched(false);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(d: Declaration) {
    setEditingId(d.id);
    setForm({
      amount: String(d.amount),
      vatRate: String(d.vatRate ?? 21),
      date: d.date.slice(0, 10),
      category: d.category,
      description: d.description,
      receiptUrl: d.receiptUrl,
      adminId: d.adminId,
    });
    setCategoryTouched(true);
    setFormError(null);
    setShowForm(true);
  }

  function handleDescriptionChange(value: string) {
    setForm((prev) => {
      const next = { ...prev, description: value };
      if (!categoryTouched) next.category = suggestCategory(value);
      return next;
    });
  }

  async function handleSave() {
    if (!session || !form.amount || !form.date || !form.category) return;
    setSaving(true);
    setFormError(null);
    try {
      const url = editingId ? `${API}/admin/declarations/${editingId}` : `${API}/admin/declarations`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      setShowForm(false);
      await fetchDeclarations();
      showToast(editingId ? "Declaratie bijgewerkt" : "Declaratie ingediend", "success");
    } catch (err) {
      setFormError(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !session) return;
    try {
      const res = await fetch(`${API}/admin/declarations/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setDeleteTarget(null);
      await fetchDeclarations();
      showToast("Declaratie verwijderd", "success");
    } catch (err) {
      showToast(String(err instanceof Error ? err.message : err), "error");
    }
  }

  const topCategory = useMemo(() => {
    const entries = Object.entries(totals.byCategory);
    if (entries.length === 0) return "—";
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [totals]);

  const years = [currentQuarter().year, currentQuarter().year - 1, currentQuarter().year - 2];

  return (
    <div style={{ padding: "40px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ color: "var(--admin-fg-solid)", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
            Declaraties
          </h1>
          <p style={{ color: "rgba(var(--admin-fg-rgb),0.4)", fontSize: "13px", marginTop: "8px" }}>
            {canViewAll ? "Alle declaraties" : "Jouw declaraties"} • {quarterKey}
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            backgroundColor: "#fffbe0", color: "#1a0c04", border: "none",
            padding: "12px 24px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
          }}
        >
          <Plus size={16} /> Nieuwe declaratie
        </button>
      </div>

      {toast && (
        <div style={{
          position: "fixed", top: "24px", right: "24px", zIndex: 10000,
          backgroundColor: toast.type === "success" ? "rgba(122,184,122,0.12)" : "rgba(224,112,96,0.12)",
          border: `1px solid ${toast.type === "success" ? "rgba(122,184,122,0.35)" : "rgba(224,112,96,0.35)"}`,
          color: toast.type === "success" ? "#7ab87a" : "#e07060",
          padding: "12px 18px", fontSize: "13px",
          display: "flex", alignItems: "center", gap: "10px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)", maxWidth: "320px",
        }}>
          {toast.type === "success" ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "24px" }}>
        <select value={q} onChange={(e) => setQ(Number(e.target.value))} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n} style={{ backgroundColor: "#1a0c04" }}>Q{n}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
          {years.map((y) => <option key={y} value={y} style={{ backgroundColor: "#1a0c04" }}>{y}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
          <option value="">Alle categorieën</option>
          {CATEGORIES.map((c) => <option key={c} value={c} style={{ backgroundColor: "#1a0c04" }}>{c}</option>)}
        </select>
        {canViewAll && (
          <select value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
            <option value="">Alle admins</option>
            {workers.map((w) => <option key={w.id} value={w.id} style={{ backgroundColor: "#1a0c04" }}>{w.name}</option>)}
          </select>
        )}
      </div>

      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "32px" }}>
        <div style={{ backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)", border: "1px solid rgba(var(--admin-fg-rgb),0.1)", padding: "18px 20px" }}>
          <div style={{ color: "rgba(var(--admin-fg-rgb),0.3)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>Totaal dit kwartaal</div>
          <div style={{ color: "var(--admin-fg-solid)", fontSize: "26px", fontWeight: 800 }}>{formatEUR(totals.amount)}</div>
        </div>
        <div style={{ backgroundColor: "rgba(200,144,90,0.08)", border: "1px solid rgba(200,144,90,0.25)", padding: "18px 20px" }}>
          <div style={{ color: "#c8905a", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>BTW terug te vragen</div>
          <div style={{ color: "#c8905a", fontSize: "26px", fontWeight: 800 }}>{formatEUR(totals.vatAmount)}</div>
        </div>
        <div style={{ backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)", border: "1px solid rgba(var(--admin-fg-rgb),0.1)", padding: "18px 20px" }}>
          <div style={{ color: "rgba(var(--admin-fg-rgb),0.3)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>Aantal declaraties</div>
          <div style={{ color: "var(--admin-fg-solid)", fontSize: "26px", fontWeight: 800 }}>{totals.count}</div>
        </div>
        <div style={{ backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)", border: "1px solid rgba(var(--admin-fg-rgb),0.1)", padding: "18px 20px" }}>
          <div style={{ color: "rgba(var(--admin-fg-rgb),0.3)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>Grootste categorie</div>
          <div style={{ color: "#c8905a", fontSize: "16px", fontWeight: 700, marginTop: "6px" }}>{topCategory}</div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: "rgba(var(--admin-fg-rgb),0.4)", fontSize: "13px" }}>Laden...</div>
      ) : declarations.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(var(--admin-fg-rgb),0.3)", fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase", border: "1px dashed rgba(var(--admin-fg-rgb),0.1)" }}>
          Geen declaraties in {quarterKey}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {declarations.map((d) => (
            <div key={d.id} style={{ backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)", border: "1px solid rgba(var(--admin-fg-rgb),0.1)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ minWidth: "90px", color: "rgba(var(--admin-fg-rgb),0.4)", fontSize: "12px" }}>
                {new Date(d.date).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              <span style={{ backgroundColor: "rgba(200,144,90,0.12)", color: "#c8905a", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "5px 10px" }}>
                {d.category}
              </span>
              <div style={{ flex: 1, minWidth: "160px", color: "rgba(var(--admin-fg-rgb),0.65)", fontSize: "13px" }}>
                {d.description || <span style={{ color: "rgba(var(--admin-fg-rgb),0.25)" }}>Geen omschrijving</span>}
              </div>
              {canViewAll && (
                <div style={{ color: "rgba(var(--admin-fg-rgb),0.35)", fontSize: "11px" }}>{d.adminName}</div>
              )}
              <div style={{ textAlign: "right", minWidth: "90px" }}>
                <div style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700 }}>
                  {formatEUR(d.amount)}
                </div>
                <div style={{ color: "#c8905a", fontSize: "10px" }}>
                  BTW {formatEUR(d.vatAmount)}
                </div>
              </div>
              {d.receiptUrl && (
                <a href={d.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(var(--admin-fg-rgb),0.4)", display: "flex", alignItems: "center" }} title="Bonnetje bekijken">
                  <Paperclip size={15} />
                </a>
              )}
              <button onClick={() => openEdit(d)} style={{ background: "none", border: "none", color: "rgba(var(--admin-fg-rgb),0.35)", cursor: "pointer", padding: "4px" }}>
                <Edit2 size={14} />
              </button>
              <button onClick={() => setDeleteTarget(d)} style={{ background: "none", border: "none", color: "rgba(224,112,96,0.5)", cursor: "pointer", padding: "4px" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(4,2,0,0.92)", backdropFilter: "blur(4px)", zIndex: 9999, overflow: "auto", padding: "40px" }}>
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
              <h2 style={{ color: "var(--admin-fg-solid)", fontSize: "22px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>
                {editingId ? "Declaratie bewerken" : "Nieuwe declaratie"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "rgba(var(--admin-fg-rgb),0.4)", cursor: "pointer" }}><X size={22} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {canViewAll && (
                <div>
                  <label style={labelStyle}>Voor wie</label>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.adminId} onChange={(e) => setForm({ ...form, adminId: e.target.value })}>
                    {workers.map((w) => <option key={w.id} value={w.id} style={{ backgroundColor: "#1a0c04" }}>{w.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>Bedrag incl. BTW (€) *</label>
                  <input style={inputStyle} type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <label style={labelStyle}>Datum *</label>
                  <input style={inputStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>BTW-tarief</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })}>
                  {VAT_RATES.map((r) => <option key={r.value} value={r.value} style={{ backgroundColor: "#1a0c04" }}>{r.label}</option>)}
                </select>
                {Number(form.amount) > 0 && (
                  <p style={{ color: "rgba(var(--admin-fg-rgb),0.35)", fontSize: "11px", margin: "8px 0 0" }}>
                    Terug te vragen BTW: <strong style={{ color: "#c8905a" }}>{formatEUR((Number(form.amount) * Number(form.vatRate)) / (100 + Number(form.vatRate)))}</strong>
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Omschrijving</label>
                <input style={inputStyle} value={form.description} onChange={(e) => handleDescriptionChange(e.target.value)} placeholder="bijv. Adobe Creative Cloud abonnement" />
              </div>

              <div>
                <label style={labelStyle}>Categorie {!categoryTouched && form.category && "(automatisch voorgesteld)"}</label>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={form.category}
                  onChange={(e) => { setCategoryTouched(true); setForm({ ...form, category: e.target.value }); }}
                >
                  <option value="">Kies een categorie</option>
                  {CATEGORIES.map((c) => <option key={c} value={c} style={{ backgroundColor: "#1a0c04" }}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Bonnetje / factuur</label>
                {form.receiptUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "rgba(var(--admin-fg-rgb),0.03)", border: "1px solid rgba(var(--admin-fg-rgb),0.1)", padding: "10px 14px" }}>
                    <Paperclip size={14} color="#c8905a" />
                    <a href={form.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#c8905a", fontSize: "12px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Bekijk geüpload bestand
                    </a>
                    <button onClick={() => setForm({ ...form, receiptUrl: "" })} style={{ background: "none", border: "none", color: "rgba(var(--admin-fg-rgb),0.4)", cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    border: "1px dashed rgba(var(--admin-fg-rgb),0.2)", padding: "18px",
                    color: "rgba(var(--admin-fg-rgb),0.4)", fontSize: "12px", cursor: uploading ? "not-allowed" : "pointer",
                  }}>
                    <Paperclip size={14} />
                    {uploading ? "Bezig met uploaden…" : "Foto of PDF uploaden"}
                    <input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} disabled={uploading} style={{ display: "none" }} />
                  </label>
                )}
              </div>

              {formError && (
                <div style={{ backgroundColor: "rgba(224,112,96,0.1)", border: "1px solid rgba(224,112,96,0.3)", color: "#e07060", padding: "10px 14px", fontSize: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <AlertCircle size={14} /> {formError}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || !form.amount || !form.date || !form.category}
                style={{
                  backgroundColor: "#fffbe0", color: "#1a0c04", border: "none", padding: "14px",
                  fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Bezig…" : editingId ? "Wijzigingen opslaan" : "Declaratie indienen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div style={{ backgroundColor: "var(--admin-bg-card)", border: "1px solid rgba(var(--admin-fg-rgb),0.15)", padding: "32px", maxWidth: "420px", width: "100%" }}>
            <h3 style={{ color: "var(--admin-fg-solid)", fontSize: "18px", fontWeight: 700, margin: "0 0 12px" }}>Declaratie verwijderen</h3>
            <p style={{ color: "rgba(var(--admin-fg-rgb),0.5)", fontSize: "14px", margin: "0 0 24px", lineHeight: 1.6 }}>
              Verwijder de declaratie van <strong style={{ color: "var(--admin-fg-solid)" }}>{formatEUR(deleteTarget.amount)}</strong>? Dit kan niet ongedaan worden gemaakt.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={confirmDelete} style={{ flex: 1, backgroundColor: "rgba(224,112,96,0.15)", border: "1px solid rgba(224,112,96,0.4)", color: "#e07060", padding: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                Verwijderen
              </button>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, backgroundColor: "transparent", border: "1px solid rgba(var(--admin-fg-rgb),0.15)", color: "rgba(var(--admin-fg-rgb),0.5)", padding: "12px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
