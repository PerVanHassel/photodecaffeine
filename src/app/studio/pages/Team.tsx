import { useQuery } from "@tanstack/react-query";
import { Crown, Plus, Shield, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { del, get, post, put } from "../api";
import { ago, initials } from "../format";
import { useAction, useMe } from "../queries";
import { Button, Card, ErrorState, Modal, PageHead, Pill, Select, SelectField, SkeletonList, TextField, useConfirm } from "../ui";

export const PERMISSIONS: { key: string; label: string; hint: string }[] = [
  { key: "manageClients", label: "Klanten, projecten en planning", hint: "Pijplijn, projecten, agenda, locaties, taken" },
  { key: "manageQuotes", label: "Offertes en facturen", hint: "Maken, versturen, betaald zetten" },
  { key: "manageInquiries", label: "Aanvragen", hint: "Contactformulier en omzetten" },
  { key: "managePortfolio", label: "Portfolio en reviews", hint: "Wat op de site staat" },
  { key: "manageAds", label: "Advertenties", hint: "Campagnes en bezoekers" },
  { key: "manageSettings", label: "Site-instellingen", hint: "Hero, secties, bedrijfsgegevens" },
  { key: "manageDeclarations", label: "Eigen declaraties", hint: "Bonnetjes indienen" },
  { key: "viewAllDeclarations", label: "Alle declaraties", hint: "Van iedereen zien en beheren" },
  { key: "manageAdmins", label: "Team en rollen", hint: "Admins toevoegen en rechten wijzigen" },
];

type Role = { id: string; name: string; permissions: Record<string, boolean> };
type Worker = { id: string; email: string; name: string; lastSignIn: string | null; isOwner: boolean; roleId: string | null; roleName: string };

const key = ["team"] as const;

export function TeamPage() {
  const confirm = useConfirm();
  const me = useMe();
  const data = useQuery({ queryKey: key, queryFn: () => get<{ workers: Worker[]; roles: Role[] }>("/admin/workers") });
  const [adding, setAdding] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | "new" | null>(null);
  const canManage = !!me.data?.permissions.manageAdmins;

  const assign = useAction({
    fn: (v: { worker: Worker; roleId: string }) => put(`/admin/workers/${v.worker.id}/role`, { roleId: v.roleId }),
    invalidate: () => [key],
    success: (_d, v) => `Rol van ${v.worker.name} gewijzigd`,
  });
  const revoke = useAction({ fn: (w: Worker) => del(`/admin/workers/${w.id}`), invalidate: () => [key], success: (_d, w) => `${w.name} heeft geen admintoegang meer` });

  const roles = data.data?.roles || [];
  return (
    <div className="s-view">
      <PageHead
        title="Team en rollen"
        sub="Wie in de studio mag, en wat elke rol mag doen. De eigenaar mag altijd alles."
        actions={canManage && <Button variant="primary" icon={<UserPlus />} onClick={() => setAdding(true)}>Admin toevoegen</Button>}
      />
      {data.isError && <ErrorState error={data.error} retry={() => data.refetch()} />}
      <Card title="Team" bodyClass="none">
        {data.isLoading ? <SkeletonList rows={3} /> : (
          <ul className="s-list">
            {(data.data?.workers || []).map((w) => (
              <li key={w.id} className="s-item" style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
                <span className="s-avatar">{initials(w.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="t">{w.name}{w.id === me.data?.id && <span className="s-faint"> (jij)</span>}</div>
                  <div className="s s-truncate">{w.email} · {w.lastSignIn ? `laatst ${ago(w.lastSignIn)}` : "nog nooit ingelogd"}</div>
                </div>
                {w.isOwner ? <Pill tone="acc"><Crown size={11} /> Eigenaar</Pill> : canManage ? (
                  <div className="s-row nowrap">
                    <Select aria-label={`Rol van ${w.name}`} value={w.roleId || ""} onChange={(e) => e.target.value && assign.mutate({ worker: w, roleId: e.target.value })} style={{ width: 150 }}>
                      {!w.roleId && <option value="">Geen rol</option>}
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                    <Button size="sm" variant="ghost" iconOnly aria-label={`${w.name} verwijderen`} icon={<Trash2 />}
                      onClick={async () => { if (await confirm({ title: `${w.name} verwijderen uit het team?`, body: "Het account blijft bestaan, maar kan niet meer in de studio.", danger: true, confirm: "Toegang intrekken" })) revoke.mutate(w); }} />
                  </div>
                ) : <Pill plain>{w.roleName}</Pill>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Rollen" action={canManage && <Button size="sm" icon={<Plus />} onClick={() => setEditingRole("new")}>Nieuwe rol</Button>} bodyClass="none">
        <div className="s-table-wrap">
          <table className="s-table">
            <thead><tr><th>Recht</th>{roles.map((r) => <th key={r.id} style={{ textAlign: "center" }}>
              {canManage ? <button type="button" onClick={() => setEditingRole(r)} style={{ textDecoration: "underline" }}>{r.name}</button> : r.name}
            </th>)}</tr></thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.key}>
                  <td><div style={{ fontWeight: 600 }}>{p.label}</div><div className="s-small s-faint">{p.hint}</div></td>
                  {roles.map((r) => <td key={r.id} style={{ textAlign: "center" }}>{r.permissions[p.key] ? <span style={{ color: "var(--ok)" }} aria-label="Ja">●</span> : <span className="s-faint" aria-label="Nee">–</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddAdminDialog open={adding} onClose={() => setAdding(false)} roles={roles} />
      <RoleDialog role={editingRole} onClose={() => setEditingRole(null)} />
    </div>
  );
}

function AddAdminDialog({ open, onClose, roles }: { open: boolean; onClose: () => void; roles: Role[] }) {
  const [f, setF] = useState({ name: "", email: "", password: "", roleId: "" });
  useEffect(() => { if (open) setF({ name: "", email: "", password: "", roleId: roles[0]?.id || "" }); }, [open, roles]);
  const add = useAction({ fn: () => post("/admin/workers", f), invalidate: () => [key], success: `Admin toegevoegd`, onSuccess: onClose });
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Admin toevoegen" description="Deel het wachtwoord zelf met de nieuwe collega; die kan het daarna wijzigen."
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" loading={add.isPending} disabled={!f.email || f.password.length < 8 || !f.roleId} onClick={() => add.mutate()}>Toevoegen</Button></>}>
      <div className="s-form-grid">
        <TextField label="Naam" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <TextField label="E-mail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <TextField label="Tijdelijk wachtwoord" type="text" autoComplete="off" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} hint="Minstens 8 tekens" />
        <SelectField label="Rol" value={f.roleId} onChange={(e) => setF({ ...f, roleId: e.target.value })}>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </SelectField>
      </div>
    </Modal>
  );
}

function RoleDialog({ role, onClose }: { role: Role | "new" | null; onClose: () => void }) {
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (role === "new") { setName(""); setPerms({}); }
    else if (role) { setName(role.name); setPerms({ ...role.permissions }); }
  }, [role]);
  const save = useAction({
    fn: () => (role === "new" ? post("/admin/roles", { name, permissions: perms }) : put(`/admin/roles/${(role as Role).id}`, { name, permissions: perms })),
    invalidate: () => [key, ["me"]],
    success: "Rol opgeslagen",
    onSuccess: onClose,
  });
  const remove = useAction({ fn: () => del(`/admin/roles/${(role as Role).id}`), invalidate: () => [key], success: "Rol verwijderd", onSuccess: onClose });
  return (
    <Modal open={!!role} onOpenChange={(o) => !o && onClose()} title={role === "new" ? "Nieuwe rol" : `Rol ${name}`}
      footer={<>
        {role && role !== "new" && <Button variant="danger" icon={<Trash2 />} style={{ marginRight: "auto" }} loading={remove.isPending}
          onClick={async () => { if (await confirm({ title: `Rol ${role.name} verwijderen?`, body: "Kan alleen als niemand deze rol meer heeft.", danger: true, confirm: "Verwijderen" })) remove.mutate(); }}>Verwijderen</Button>}
        <Button onClick={onClose}>Annuleren</Button>
        <Button variant="primary" loading={save.isPending} disabled={!name.trim()} onClick={() => save.mutate()}>Opslaan</Button>
      </>}>
      <TextField label="Naam" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="s-stack sm">
        {PERMISSIONS.map((p) => (
          <label key={p.key} className="s-check" style={{ alignItems: "flex-start" }}>
            <input type="checkbox" checked={!!perms[p.key]} onChange={(e) => setPerms({ ...perms, [p.key]: e.target.checked })} />
            <span><b style={{ fontWeight: 600 }}>{p.label}</b><br /><span className="s-small s-faint">{p.hint}</span></span>
          </label>
        ))}
      </div>
      <p className="s-small s-muted"><Shield size={12} /> Wijzigingen gelden meteen voor iedereen met deze rol.</p>
    </Modal>
  );
}
