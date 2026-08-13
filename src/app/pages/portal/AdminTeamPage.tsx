import { useState, useEffect } from "react";
import { Plus, Trash2, X, Check, AlertCircle, Shield, Crown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { projectId } from "/utils/supabase/info";

const OWNER_EMAIL = "pervanhassel@gmail.com";
const API = `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e`;

const PERMISSION_LABELS: Record<string, string> = {
  manageAdmins: "Team & rollen beheren",
  manageClients: "Klanten & projecten beheren",
  managePortfolio: "Portfolio beheren",
  manageInquiries: "Aanvragen inzien",
  manageReminders: "Actiepunten inzien",
  manageAds: "Advertenties beheren",
  manageSettings: "Site-instellingen beheren",
  manageDeclarations: "Eigen declaraties indienen",
  viewAllDeclarations: "Alle declaraties inzien & beheren (CFO)",
};
const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS);

type Role = {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
};

type Worker = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignIn: string | null;
  isOwner: boolean;
  roleId: string | null;
  roleName: string;
  permissions: Record<string, boolean> | null;
};

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

export function AdminTeamPage() {
  const { session, user } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", roleId: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<Worker | null>(null);
  const [removing, setRemoving] = useState(false);

  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState<{ name: string; permissions: Record<string, boolean> }>({
    name: "",
    permissions: {},
  });
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<Role | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const isOwner = user?.email === OWNER_EMAIL;
  const me = workers.find((w) => w.id === user?.id);
  const canManage = isOwner || !!me?.permissions?.manageAdmins;

  useEffect(() => {
    if (session) fetchWorkers();
  }, [session]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  async function fetchWorkers() {
    if (!session) return;
    try {
      const res = await fetch(`${API}/admin/workers`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setWorkers(data.workers || []);
      setRoles(data.roles || []);
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAdmin() {
    if (!session || !addForm.email.trim() || !addForm.password || !addForm.roleId) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`${API}/admin/workers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aanmaken mislukt");
      setShowAddAdmin(false);
      setAddForm({ name: "", email: "", password: "", roleId: "" });
      await fetchWorkers();
      showToast("Admin toegevoegd", "success");
    } catch (err) {
      setAddError(String(err instanceof Error ? err.message : err));
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleChange(workerId: string, roleId: string) {
    if (!session) return;
    try {
      const res = await fetch(`${API}/admin/workers/${workerId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ roleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wijzigen mislukt");
      await fetchWorkers();
      showToast("Rol bijgewerkt", "success");
    } catch (err) {
      showToast(String(err instanceof Error ? err.message : err), "error");
    }
  }

  async function confirmRemove() {
    if (!removeTarget || !session) return;
    setRemoving(true);
    try {
      const res = await fetch(`${API}/admin/workers/${removeTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");
      setRemoveTarget(null);
      await fetchWorkers();
      showToast("Adminrechten ingetrokken", "success");
    } catch (err) {
      showToast(String(err instanceof Error ? err.message : err), "error");
    } finally {
      setRemoving(false);
    }
  }

  function openNewRole() {
    setEditingRole(null);
    const blank: Record<string, boolean> = {};
    PERMISSION_KEYS.forEach((k) => (blank[k] = false));
    setRoleForm({ name: "", permissions: blank });
    setRoleError(null);
    setShowRoleForm(true);
  }

  function openEditRole(role: Role) {
    setEditingRole(role);
    const perms: Record<string, boolean> = {};
    PERMISSION_KEYS.forEach((k) => (perms[k] = !!role.permissions?.[k]));
    setRoleForm({ name: role.name, permissions: perms });
    setRoleError(null);
    setShowRoleForm(true);
  }

  async function handleSaveRole() {
    if (!session || !roleForm.name.trim()) return;
    try {
      const url = editingRole ? `${API}/admin/roles/${editingRole.id}` : `${API}/admin/roles`;
      const res = await fetch(url, {
        method: editingRole ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: roleForm.name.trim(), permissions: roleForm.permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      setShowRoleForm(false);
      await fetchWorkers();
      showToast(editingRole ? "Rol bijgewerkt" : "Rol aangemaakt", "success");
    } catch (err) {
      setRoleError(String(err instanceof Error ? err.message : err));
    }
  }

  async function confirmDeleteRole() {
    if (!deleteRoleTarget || !session) return;
    try {
      const res = await fetch(`${API}/admin/roles/${deleteRoleTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");
      setDeleteRoleTarget(null);
      await fetchWorkers();
      showToast("Rol verwijderd", "success");
    } catch (err) {
      showToast(String(err instanceof Error ? err.message : err), "error");
      setDeleteRoleTarget(null);
    }
  }

  if (loading) {
    return <div style={{ padding: "40px", color: "rgba(var(--admin-fg-rgb),0.4)" }}>Team laden...</div>;
  }

  if (!canManage) {
    return (
      <div style={{ padding: "40px", fontFamily: "'Inter', sans-serif" }}>
        <h1 style={{ color: "var(--admin-fg-solid)", fontSize: "24px", fontWeight: 800, textTransform: "uppercase", margin: "0 0 12px" }}>
          Team &amp; Rollen
        </h1>
        <p style={{ color: "rgba(var(--admin-fg-rgb),0.4)", fontSize: "14px" }}>
          Je hebt geen rechten om het team te beheren. Vraag de eigenaar om je rol de rechten &quot;Team &amp; rollen beheren&quot; te geven.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ color: "var(--admin-fg-solid)", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>
          Team &amp; Rollen
        </h1>
        <p style={{ color: "rgba(var(--admin-fg-rgb),0.4)", fontSize: "13px", marginTop: "8px" }}>
          {workers.length} admin{workers.length !== 1 ? "s" : ""} • {roles.length} rol{roles.length !== 1 ? "len" : ""}
        </p>
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

      {/* ── Admins ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ color: "var(--admin-fg-solid)", fontSize: "16px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          Admins
        </h2>
        <button
          onClick={() => setShowAddAdmin(true)}
          style={{
            backgroundColor: "#fffbe0", color: "#1a0c04", border: "none",
            padding: "10px 18px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
          }}
        >
          <Plus size={14} /> Nieuwe admin
        </button>
      </div>

      <div style={{ display: "grid", gap: "10px", marginBottom: "48px" }}>
        {workers.map((w) => (
          <div
            key={w.id}
            style={{
              backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)",
              border: "1px solid rgba(var(--admin-fg-rgb),0.1)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div style={{
              width: "36px", height: "36px", flexShrink: 0,
              backgroundColor: w.isOwner ? "rgba(200,144,90,0.2)" : "rgba(var(--admin-fg-rgb),0.06)",
              border: `1px solid ${w.isOwner ? "rgba(200,144,90,0.35)" : "rgba(var(--admin-fg-rgb),0.12)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: w.isOwner ? "#c8905a" : "rgba(var(--admin-fg-rgb),0.6)", fontSize: "12px", fontWeight: 700,
            }}>
              {w.isOwner ? <Crown size={16} /> : w.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "var(--admin-fg-solid)", fontSize: "14px", fontWeight: 600 }}>{w.name}</div>
              <div style={{ color: "rgba(var(--admin-fg-rgb),0.35)", fontSize: "12px" }}>{w.email}</div>
            </div>

            {w.isOwner ? (
              <span style={{
                backgroundColor: "rgba(200,144,90,0.15)", color: "#c8905a",
                fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                padding: "6px 12px", border: "1px solid rgba(200,144,90,0.3)",
              }}>
                Eigenaar
              </span>
            ) : (
              <select
                value={w.roleId || ""}
                onChange={(e) => handleRoleChange(w.id, e.target.value)}
                style={{
                  backgroundColor: "rgba(var(--admin-fg-rgb),0.05)",
                  border: "1px solid rgba(var(--admin-fg-rgb),0.15)",
                  color: "var(--admin-fg-solid)", fontSize: "12px", padding: "8px 10px",
                  fontFamily: "'Inter', sans-serif", cursor: "pointer",
                }}
              >
                {!w.roleId && <option value="">Geen rol</option>}
                {roles.map((r) => (
                  <option key={r.id} value={r.id} style={{ backgroundColor: "#1a0c04" }}>{r.name}</option>
                ))}
              </select>
            )}

            {!w.isOwner && (
              <button
                onClick={() => setRemoveTarget(w)}
                style={{ background: "none", border: "none", color: "rgba(224,112,96,0.6)", cursor: "pointer", padding: "6px" }}
                title="Adminrechten intrekken"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Rollen ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ color: "var(--admin-fg-solid)", fontSize: "16px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          Rollen
        </h2>
        <button
          onClick={openNewRole}
          style={{
            backgroundColor: "transparent", color: "var(--admin-fg-solid)", border: "1px solid rgba(var(--admin-fg-rgb),0.2)",
            padding: "10px 18px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
          }}
        >
          <Plus size={14} /> Nieuwe rol
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
        {roles.map((role) => {
          const activePerms = PERMISSION_KEYS.filter((k) => role.permissions?.[k]);
          return (
            <div key={role.id} style={{ backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)", border: "1px solid rgba(var(--admin-fg-rgb),0.1)", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shield size={14} color="#c8905a" />
                  <span style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700 }}>{role.name}</span>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => openEditRole(role)} style={{ background: "none", border: "none", color: "rgba(var(--admin-fg-rgb),0.4)", cursor: "pointer", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 6px" }}>
                    Bewerken
                  </button>
                  <button onClick={() => setDeleteRoleTarget(role)} style={{ background: "none", border: "none", color: "rgba(224,112,96,0.5)", cursor: "pointer", padding: "4px 6px" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {activePerms.length === 0 ? (
                <div style={{ color: "rgba(var(--admin-fg-rgb),0.25)", fontSize: "12px" }}>Geen rechten toegekend</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {activePerms.map((k) => (
                    <div key={k} style={{ color: "rgba(var(--admin-fg-rgb),0.55)", fontSize: "11.5px", display: "flex", gap: "6px", alignItems: "center" }}>
                      <Check size={11} color="#7ab87a" />
                      {PERMISSION_LABELS[k]}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddAdmin(false); }}
        >
          <div style={{ backgroundColor: "var(--admin-bg-card)", border: "1px solid rgba(var(--admin-fg-rgb),0.15)", padding: "32px", maxWidth: "440px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ color: "var(--admin-fg-solid)", fontSize: "18px", fontWeight: 700, margin: 0 }}>Nieuwe admin</h3>
              <button onClick={() => setShowAddAdmin(false)} style={{ background: "none", border: "none", color: "rgba(var(--admin-fg-rgb),0.4)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Naam</label>
                <input style={inputStyle} value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Volledige naam" />
              </div>
              <div>
                <label style={labelStyle}>E-mail *</label>
                <input style={inputStyle} type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="naam@photodecaffeine.com" />
              </div>
              <div>
                <label style={labelStyle}>Wachtwoord *</label>
                <input style={inputStyle} type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="Tijdelijk wachtwoord" />
              </div>
              <div>
                <label style={labelStyle}>Rol *</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={addForm.roleId} onChange={(e) => setAddForm({ ...addForm, roleId: e.target.value })}>
                  <option value="">Kies een rol</option>
                  {roles.map((r) => <option key={r.id} value={r.id} style={{ backgroundColor: "#1a0c04" }}>{r.name}</option>)}
                </select>
              </div>
              {addError && (
                <div style={{ backgroundColor: "rgba(224,112,96,0.1)", border: "1px solid rgba(224,112,96,0.3)", color: "#e07060", padding: "10px 14px", fontSize: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <AlertCircle size={14} /> {addError}
                </div>
              )}
              <button
                onClick={handleAddAdmin}
                disabled={adding || !addForm.email.trim() || !addForm.password || !addForm.roleId}
                style={{
                  backgroundColor: "#fffbe0", color: "#1a0c04", border: "none", padding: "14px",
                  fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  cursor: adding ? "not-allowed" : "pointer", opacity: adding ? 0.6 : 1,
                }}
              >
                {adding ? "Bezig…" : "Admin toevoegen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Admin Confirm */}
      {removeTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setRemoveTarget(null); }}
        >
          <div style={{ backgroundColor: "var(--admin-bg-card)", border: "1px solid rgba(var(--admin-fg-rgb),0.15)", padding: "32px", maxWidth: "420px", width: "100%" }}>
            <h3 style={{ color: "var(--admin-fg-solid)", fontSize: "18px", fontWeight: 700, margin: "0 0 12px" }}>Adminrechten intrekken</h3>
            <p style={{ color: "rgba(var(--admin-fg-rgb),0.5)", fontSize: "14px", margin: "0 0 24px", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--admin-fg-solid)" }}>{removeTarget.name}</strong> verliest toegang tot het adminpaneel. Het account zelf blijft bestaan.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={confirmRemove} disabled={removing} style={{ flex: 1, backgroundColor: "rgba(224,112,96,0.15)", border: "1px solid rgba(224,112,96,0.4)", color: "#e07060", padding: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: removing ? "not-allowed" : "pointer" }}>
                {removing ? "Bezig…" : "Intrekken"}
              </button>
              <button onClick={() => setRemoveTarget(null)} style={{ flex: 1, backgroundColor: "transparent", border: "1px solid rgba(var(--admin-fg-rgb),0.15)", color: "rgba(var(--admin-fg-rgb),0.5)", padding: "12px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Form Modal */}
      {showRoleForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(4,2,0,0.92)", backdropFilter: "blur(4px)", zIndex: 9999, overflow: "auto", padding: "40px" }}>
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
              <h2 style={{ color: "var(--admin-fg-solid)", fontSize: "22px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>
                {editingRole ? "Rol bewerken" : "Nieuwe rol"}
              </h2>
              <button onClick={() => setShowRoleForm(false)} style={{ background: "none", border: "none", color: "rgba(var(--admin-fg-rgb),0.4)", cursor: "pointer" }}><X size={22} /></button>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Naam *</label>
              <input style={inputStyle} value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="bijv. CFO" />
            </div>

            <label style={labelStyle}>Rechten</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "24px" }}>
              {PERMISSION_KEYS.map((key) => (
                <label key={key} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", backgroundColor: "rgba(var(--admin-fg-rgb),0.02)",
                  border: "1px solid rgba(var(--admin-fg-rgb),0.06)", cursor: "pointer",
                }}>
                  <input
                    type="checkbox"
                    checked={!!roleForm.permissions[key]}
                    onChange={(e) => setRoleForm({ ...roleForm, permissions: { ...roleForm.permissions, [key]: e.target.checked } })}
                    style={{ width: "16px", height: "16px", accentColor: "#c8905a", cursor: "pointer" }}
                  />
                  <span style={{ color: "rgba(var(--admin-fg-rgb),0.75)", fontSize: "13px" }}>{PERMISSION_LABELS[key]}</span>
                </label>
              ))}
            </div>

            {roleError && (
              <div style={{ backgroundColor: "rgba(224,112,96,0.1)", border: "1px solid rgba(224,112,96,0.3)", color: "#e07060", padding: "10px 14px", fontSize: "12px", marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
                <AlertCircle size={14} /> {roleError}
              </div>
            )}

            <button
              onClick={handleSaveRole}
              disabled={!roleForm.name.trim()}
              style={{
                width: "100%", backgroundColor: "#fffbe0", color: "#1a0c04", border: "none", padding: "14px",
                fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
              }}
            >
              {editingRole ? "Rol opslaan" : "Rol aanmaken"}
            </button>
          </div>
        </div>
      )}

      {/* Delete Role Confirm */}
      {deleteRoleTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteRoleTarget(null); }}
        >
          <div style={{ backgroundColor: "var(--admin-bg-card)", border: "1px solid rgba(var(--admin-fg-rgb),0.15)", padding: "32px", maxWidth: "420px", width: "100%" }}>
            <h3 style={{ color: "var(--admin-fg-solid)", fontSize: "18px", fontWeight: 700, margin: "0 0 12px" }}>Rol verwijderen</h3>
            <p style={{ color: "rgba(var(--admin-fg-rgb),0.5)", fontSize: "14px", margin: "0 0 24px", lineHeight: 1.6 }}>
              Verwijder de rol <strong style={{ color: "var(--admin-fg-solid)" }}>{deleteRoleTarget.name}</strong>? Dit kan alleen als geen enkele admin deze rol meer heeft.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={confirmDeleteRole} style={{ flex: 1, backgroundColor: "rgba(224,112,96,0.15)", border: "1px solid rgba(224,112,96,0.4)", color: "#e07060", padding: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                Verwijderen
              </button>
              <button onClick={() => setDeleteRoleTarget(null)} style={{ flex: 1, backgroundColor: "transparent", border: "1px solid rgba(var(--admin-fg-rgb),0.15)", color: "rgba(var(--admin-fg-rgb),0.5)", padding: "12px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
