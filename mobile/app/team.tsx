import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useApi, useQuery, type QueryState } from "@/useApi";
import type { Role, Worker } from "@/api";
import { useColors } from "@/ThemeContext";
import { radius, timeAgo } from "@/theme";
import { Avatar, Card, Chip, Divider, Press, Row, Stack, Txt } from "@/ui/base";
import { Button, Field, Input, Segmented, Select, Switch } from "@/ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "@/ui/feedback";
import { HeaderAction, Screen } from "@/ui/Screen";
import { ConfirmSheet, Sheet } from "@/ui/Sheet";

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

type Tab = "people" | "roles";

export default function TeamScreen() {
  const api = useApi();
  const [tab, setTab] = useState<Tab>("people");

  const workers = useQuery(() => api.workers(), [api]);
  const roles = useQuery(() => api.roles(), [api]);

  const [addingWorker, setAddingWorker] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

  async function refreshAll() {
    await Promise.all([workers.refresh(), roles.refresh()]);
  }

  return (
    <Screen
      title="Team & rollen"
      eyebrow={`${workers.data?.length ?? 0} leden · ${roles.data?.length ?? 0} rollen`}
      back
      fullBleedBottom
      onRefresh={refreshAll}
      refreshing={workers.refreshing || roles.refreshing}
      trailing={
        <HeaderAction
          label={tab === "people" ? "Lid toevoegen" : "Rol toevoegen"}
          icon="plus"
          onPress={() =>
            tab === "people" ? setAddingWorker(true) : setEditingRole({ name: "", permissions: {} })
          }
        />
      }
      hero={
        <View style={{ marginBottom: 18 }}>
          <Segmented
            value={tab}
            onChange={(v) => setTab(v)}
            options={[
              { value: "people", label: "Mensen", badge: workers.data?.length },
              { value: "roles", label: "Rollen", badge: roles.data?.length },
            ]}
          />
        </View>
      }
    >
      {tab === "people" ? (
        <PeopleTab
          workers={workers}
          roles={roles.data ?? []}
          onChanged={refreshAll}
          adding={addingWorker}
          setAdding={setAddingWorker}
        />
      ) : (
        <RolesTab
          roles={roles}
          editing={editingRole}
          setEditing={setEditingRole}
          onChanged={refreshAll}
        />
      )}
    </Screen>
  );
}

function PeopleTab({
  workers,
  roles,
  onChanged,
  adding,
  setAdding,
}: {
  workers: QueryState<Worker[]>;
  roles: Role[];
  onChanged: () => Promise<void>;
  adding: boolean;
  setAdding: (v: boolean) => void;
}) {
  const c = useColors();
  const api = useApi();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<Worker | null>(null);
  const [roleFor, setRoleFor] = useState<Worker | null>(null);

  async function remove(worker: Worker) {
    setPendingDelete(null);
    try {
      await api.deleteWorker(worker.id);
      toast(`${worker.name} verwijderd`, "success");
      await onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
  }

  async function assignRole(worker: Worker, roleId: string) {
    setRoleFor(null);
    try {
      await api.setWorkerRole(worker.id, roleId || null);
      toast("Rol bijgewerkt", "success");
      await onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Bijwerken mislukt", "error");
    }
  }

  if (workers.loading) return <SkeletonList rows={4} />;
  if (workers.error) return <ErrorState message={workers.error} onRetry={workers.refresh} />;

  const list = workers.data ?? [];

  return (
    <>
      {list.length === 0 ? (
        <Empty icon="shield" title="Nog geen teamleden" />
      ) : (
        <Stack gap={9}>
          {list.map((w, i) => (
            <Animated.View
              key={w.id}
              entering={FadeInDown.delay(Math.min(i, 8) * 30).springify().damping(20)}
            >
              <Card style={{ padding: 14 }}>
                <Row gap={12}>
                  <Avatar name={w.name} size={40} tone={w.isOwner ? "copper" : "info"} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: "600", color: c.fg }}>
                      {w.name}
                    </Text>
                    <Txt variant="meta" numberOfLines={1} style={{ fontSize: 11.5, marginTop: 2 }}>
                      {w.email}
                    </Txt>
                    <Row gap={7} style={{ marginTop: 8, flexWrap: "wrap" }}>
                      <Chip tone={w.isOwner ? "copper" : "neutral"}>
                        {w.isOwner ? "Eigenaar" : w.roleName || "Geen rol"}
                      </Chip>
                      <Txt variant="meta" style={{ fontSize: 10.5, color: c.fg4 }}>
                        {`Actief ${timeAgo(w.lastSignIn)}`}
                      </Txt>
                    </Row>
                  </View>

                  {/* The owner's access is structural — it cannot be revoked or
                      reassigned from here, so those controls stay hidden. */}
                  {!w.isOwner && (
                    <Stack gap={2}>
                      <Press
                        onPress={() => setRoleFor(w)}
                        accessibilityLabel="Rol wijzigen"
                        style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                      >
                        <Feather name="shield" size={15} color={c.fg3} />
                      </Press>
                      <Press
                        onPress={() => setPendingDelete(w)}
                        accessibilityLabel="Verwijderen"
                        style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                      >
                        <Feather name="trash-2" size={15} color={c.fg4} />
                      </Press>
                    </Stack>
                  )}
                </Row>
              </Card>
            </Animated.View>
          ))}
        </Stack>
      )}

      <Sheet open={!!roleFor} onClose={() => setRoleFor(null)} title={`Rol voor ${roleFor?.name ?? ""}`}>
        <Stack gap={8} style={{ paddingBottom: 8 }}>
          {[{ id: "", name: "Geen rol" }, ...roles].map((role) => {
            const active = (roleFor?.roleId ?? "") === role.id;
            return (
              <Press
                key={role.id || "none"}
                scale={false}
                onPress={() => roleFor && assignRole(roleFor, role.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 50,
                  paddingHorizontal: 14,
                  borderRadius: radius.md,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: active ? c.copper : c.line,
                  backgroundColor: active ? c.copperWash : c.surface,
                }}
              >
                <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "600", color: c.fg }}>
                  {role.name}
                </Text>
                {active && <Feather name="check" size={16} color={c.copper} />}
              </Press>
            );
          })}
        </Stack>
      </Sheet>

      <ConfirmSheet
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title={`${pendingDelete?.name ?? ""} verwijderen?`}
        body="Dit account verliest direct toegang tot het admin panel."
      />

      <AddWorkerSheet
        open={adding}
        roles={roles}
        onClose={() => setAdding(false)}
        onCreated={async () => {
          setAdding(false);
          await onChanged();
        }}
      />
    </>
  );
}

function AddWorkerSheet({
  open,
  roles,
  onClose,
  onCreated,
}: {
  open: boolean;
  roles: Role[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const api = useApi();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || password.length < 8) {
      toast("Vul naam, e-mail en een wachtwoord van 8+ tekens in", "error");
      return;
    }
    setBusy(true);
    try {
      await api.createWorker({
        name: name.trim(),
        email: email.trim(),
        password,
        roleId: roleId || undefined,
      });
      toast("Teamlid toegevoegd", "success");
      setName("");
      setEmail("");
      setPassword("");
      setRoleId("");
      await onCreated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Aanmaken mislukt", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Teamlid toevoegen"
      subtitle="Geef het wachtwoord persoonlijk door — het is daarna niet meer op te vragen."
      footer={
        <Button full busy={busy} onPress={submit}>
          Aanmaken
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Naam">
          <Input value={name} onChangeText={setName} autoFocus />
        </Field>
        <Field label="E-mail">
          <Input
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
        <Field label="Wachtwoord" hint="Minimaal 8 tekens">
          <Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        </Field>
        <Field label="Rol" hint="Kan later gewijzigd worden">
          <Select
            value={roleId}
            onChange={setRoleId}
            options={[
              { value: "", label: "Geen rol" },
              ...roles.map((r) => ({ value: r.id, label: r.name })),
            ]}
            title="Rol"
          />
        </Field>
      </Stack>
    </Sheet>
  );
}

function RolesTab({
  roles,
  editing,
  setEditing,
  onChanged,
}: {
  roles: QueryState<Role[]>;
  editing: Partial<Role> | null;
  setEditing: (r: Partial<Role> | null) => void;
  onChanged: () => Promise<void>;
}) {
  const c = useColors();
  const api = useApi();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

  async function remove(role: Role) {
    setPendingDelete(null);
    try {
      await api.deleteRole(role.id);
      toast("Rol verwijderd", "success");
      await onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
  }

  if (roles.loading) return <SkeletonList rows={3} />;
  if (roles.error) return <ErrorState message={roles.error} onRetry={roles.refresh} />;

  const list = roles.data ?? [];

  return (
    <>
      {list.length === 0 ? (
        <Empty
          icon="shield"
          title="Nog geen rollen"
          body="Maak een rol met de rechten die erbij horen, en wijs die toe aan teamleden."
          action={{
            label: "Rol aanmaken",
            onPress: () => setEditing({ name: "", permissions: {} }),
          }}
        />
      ) : (
        <Stack gap={9}>
          {list.map((role, i) => {
            const granted = PERMISSION_KEYS.filter((k) => role.permissions?.[k]);
            return (
              <Animated.View
                key={role.id}
                entering={FadeInDown.delay(Math.min(i, 8) * 30).springify().damping(20)}
              >
                <Card style={{ padding: 15 }}>
                  <Row gap={10}>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: "600", color: c.fg }}>
                        {role.name}
                      </Text>
                      <Txt variant="meta" style={{ fontSize: 11.5, marginTop: 2 }}>
                        {`${granted.length} van ${PERMISSION_KEYS.length} rechten`}
                      </Txt>
                    </View>
                    <Press onPress={() => setEditing(role)} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: c.copper }}>Bewerken</Text>
                    </Press>
                    <Press
                      onPress={() => setPendingDelete(role)}
                      accessibilityLabel="Verwijderen"
                      style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                    >
                      <Feather name="trash-2" size={15} color={c.fg4} />
                    </Press>
                  </Row>

                  {granted.length > 0 && (
                    <>
                      <Divider style={{ marginVertical: 12 }} />
                      <Row gap={6} style={{ flexWrap: "wrap" }}>
                        {granted.map((k) => (
                          <Chip key={k} tone="ok">
                            {PERMISSION_LABELS[k]}
                          </Chip>
                        ))}
                      </Row>
                    </>
                  )}
                </Card>
              </Animated.View>
            );
          })}
        </Stack>
      )}

      <ConfirmSheet
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title={`Rol "${pendingDelete?.name ?? ""}" verwijderen?`}
        body="Teamleden met deze rol houden hun account maar verliezen de bijbehorende rechten."
      />

      <RoleSheet
        role={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await onChanged();
        }}
      />
    </>
  );
}

function RoleSheet({
  role,
  onClose,
  onSaved,
}: {
  role: Partial<Role> | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const api = useApi();
  const toast = useToast();

  const [name, setName] = useState(role?.name ?? "");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(role?.permissions ?? {});
  const [busy, setBusy] = useState(false);
  const [seededFor, setSeededFor] = useState<string | undefined>(role?.id);

  if (role && seededFor !== role.id) {
    setSeededFor(role.id);
    setName(role.name ?? "");
    setPermissions(role.permissions ?? {});
  }

  const grantedCount = useMemo(
    () => PERMISSION_KEYS.filter((k) => permissions[k]).length,
    [permissions]
  );

  async function save() {
    if (!name.trim()) {
      toast("Geef de rol een naam", "error");
      return;
    }
    setBusy(true);
    try {
      if (role?.id) await api.updateRole(role.id, { name: name.trim(), permissions });
      else await api.createRole({ name: name.trim(), permissions });
      toast("Rol opgeslagen", "success");
      await onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Opslaan mislukt", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!role}
      onClose={onClose}
      title={role?.id ? "Rol bewerken" : "Nieuwe rol"}
      subtitle={`${grantedCount} van ${PERMISSION_KEYS.length} rechten toegekend`}
      footer={
        <Button full busy={busy} onPress={save}>
          Opslaan
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Naam">
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Bijv. Fotograaf, CFO"
            autoFocus
          />
        </Field>

        <Card style={{ paddingHorizontal: 14, paddingVertical: 2 }}>
          {PERMISSION_KEYS.map((key, i) => (
            <View key={key}>
              {i > 0 && <Divider />}
              <Switch
                checked={!!permissions[key]}
                onChange={(v) => setPermissions((p) => ({ ...p, [key]: v }))}
                label={PERMISSION_LABELS[key]}
              />
            </View>
          ))}
        </Card>
      </Stack>
    </Sheet>
  );
}
