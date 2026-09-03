import { motion } from "motion/react";
import { Copy, FolderOpen, Mail, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useApi, useQuery } from "../useApi";
import { useAppData } from "../AppData";
import type { Project, ProjectStatus } from "../api";
import { c, dateFull, spring, timeAgo } from "../theme";
import { haptic } from "../haptics";
import { Avatar, Card, CardButton, Chip, Divider, Ellipsis, Press, Row, SectionLabel, Stack } from "../ui/base";
import { Button, Field, Input, Select, Textarea } from "../ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "../ui/feedback";
import { HeaderAction, Screen } from "../ui/Screen";
import { ActionSheet, ConfirmSheet, Sheet } from "../ui/Sheet";
import { STATUS_LABEL, STATUS_TONE, PROJECT_STATUSES } from "./projectStatus";

export function ClientDetailScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const toast = useToast();
  const { refresh: refreshGlobal } = useAppData();

  const query = useQuery(() => api.client(id), [api, id]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const client = query.data?.client;
  const projects = query.data?.projects ?? [];

  async function copyEmail() {
    if (!client) return;
    try {
      await navigator.clipboard.writeText(client.email);
      haptic("success");
      toast("E-mailadres gekopieerd", "success");
    } catch {
      toast("Kopiëren lukte niet", "error");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteClient(id);
      toast("Klant verwijderd", "success");
      // The clients list is shared state; refresh it so the row is gone by
      // the time the pop animation lands on the list screen.
      refreshGlobal();
      navigate("/app/clients", { replace: true });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Screen
      title={client?.name ?? "Klant"}
      eyebrow={client?.company || undefined}
      back="/app/clients"
      fullBleedBottom
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      trailing={
        <HeaderAction
          label="Meer"
          icon={<MoreHorizontal size={20} />}
          onClick={() => setMenuOpen(true)}
        />
      }
    >
      {query.loading ? (
        <SkeletonList rows={4} />
      ) : query.error || !client ? (
        <ErrorState message={query.error ?? "Klant niet gevonden"} onRetry={query.refresh} />
      ) : (
        <Stack gap={26}>
          {/* Identity card */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring.smooth}>
            <Card style={{ padding: 18 }}>
              <Row gap={14}>
                <Avatar name={client.name} size={54} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Ellipsis style={{ fontSize: 17, fontWeight: 700, color: c.fg }}>
                    {client.name}
                  </Ellipsis>
                  {client.company && (
                    <Ellipsis style={{ fontSize: 13, color: c.fg3, marginTop: 2 }}>
                      {client.company}
                    </Ellipsis>
                  )}
                </div>
              </Row>

              <Divider style={{ margin: "16px 0" }} />

              <Stack gap={12}>
                <Row gap={10}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <MetaLabel>E-mail</MetaLabel>
                    <Ellipsis className="m-selectable" style={{ fontSize: 13.5, color: c.fg, marginTop: 3 }}>
                      {client.email}
                    </Ellipsis>
                  </div>
                  <Press
                    onClick={copyEmail}
                    aria-label="E-mail kopiëren"
                    style={{ width: 40, height: 40, display: "grid", placeItems: "center", color: c.fg3 }}
                  >
                    <Copy size={15} />
                  </Press>
                </Row>
                <Divider />
                <Row gap={16}>
                  <div style={{ flex: 1 }}>
                    <MetaLabel>Klant sinds</MetaLabel>
                    <div style={{ fontSize: 13.5, color: c.fg, marginTop: 3 }}>
                      {dateFull(client.createdAt)}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <MetaLabel>Laatst actief</MetaLabel>
                    <div style={{ fontSize: 13.5, color: c.fg, marginTop: 3 }}>
                      {timeAgo(client.lastSignIn)}
                    </div>
                  </div>
                </Row>
              </Stack>

              <Button
                variant="secondary"
                full
                size="sm"
                icon={<Mail size={15} />}
                onClick={() => (window.location.href = `mailto:${client.email}`)}
                style={{ marginTop: 16 }}
              >
                Mail versturen
              </Button>
            </Card>
          </motion.div>

          {/* Projects */}
          <section>
            <SectionLabel action={{ label: "Nieuw", onClick: () => setCreating(true) }}>
              Projecten · {projects.length}
            </SectionLabel>

            {projects.length === 0 ? (
              <Empty
                icon={<FolderOpen size={22} />}
                title="Nog geen projecten"
                body="Maak een project aan zodat deze klant voortgang, planning en galerij kan volgen in het portaal."
                action={{ label: "Project aanmaken", onClick: () => setCreating(true) }}
              />
            ) : (
              <Stack gap={9}>
                {projects.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.smooth, delay: Math.min(i, 8) * 0.04 }}
                  >
                    <CardButton onClick={() => navigate(`/app/project/${p.id}`)} style={{ padding: 14 }}>
                      <Row gap={12} align="flex-start">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Ellipsis style={{ fontSize: 14.5, fontWeight: 650, color: c.fg }}>
                            {p.title}
                          </Ellipsis>
                          <Ellipsis style={{ fontSize: 12, color: c.fg3, marginTop: 3 }}>
                            {p.phase || "Geen fase"}
                            {p.dueDate ? ` · ${dateFull(p.dueDate)}` : ""}
                          </Ellipsis>
                          <Row gap={7} style={{ marginTop: 9, flexWrap: "wrap" }}>
                            <Chip tone={STATUS_TONE[p.status] ?? "neutral"}>
                              {STATUS_LABEL[p.status] ?? p.status}
                            </Chip>
                            {!!p.galleryUrls?.length && (
                              <Chip tone="neutral">{p.galleryUrls.length} foto's</Chip>
                            )}
                            {!!p.deliverables?.length && (
                              <Chip tone="neutral">
                                {p.deliverables.filter((d) => d.done).length}/{p.deliverables.length}{" "}
                                klaar
                              </Chip>
                            )}
                          </Row>
                        </div>
                      </Row>
                    </CardButton>
                  </motion.div>
                ))}
              </Stack>
            )}
          </section>
        </Stack>
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={client?.name}
        actions={[
          { label: "Nieuw project", icon: <Plus size={17} />, onClick: () => setCreating(true) },
          {
            label: "Klant verwijderen",
            icon: <Trash2 size={17} />,
            onClick: () => setConfirmDelete(true),
            destructive: true,
          },
        ]}
      />

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        busy={deleting}
        title={`${client?.name} verwijderen?`}
        body="Het account, alle projecten, berichten en galerijen verdwijnen definitief."
      />

      <NewProjectSheet
        open={creating}
        clientId={id}
        onClose={() => setCreating(false)}
        onCreated={(project) => {
          setCreating(false);
          query.refresh();
          refreshGlobal();
          navigate(`/app/project/${project.id}`);
        }}
      />
    </Screen>
  );
}

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: c.fg4,
      }}
    >
      {children}
    </div>
  );
}

function NewProjectSheet({
  open,
  clientId,
  onClose,
  onCreated,
}: {
  open: boolean;
  clientId: string;
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const api = useApi();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("Pre-Production");
  const [status, setStatus] = useState<ProjectStatus>("in_progress");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) {
      toast("Geef het project een titel", "error");
      return;
    }
    setBusy(true);
    try {
      const project = await api.createProject({
        clientId,
        title: title.trim(),
        status,
        phase,
        dueDate,
        description: description.trim(),
      });
      toast("Project aangemaakt", "success");
      setTitle("");
      setDescription("");
      setDueDate("");
      onCreated(project);
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
      title="Nieuw project"
      footer={
        <Button full busy={busy} onClick={submit}>
          Aanmaken
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Titel">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bijv. Porsche 911 — studio shoot"
            autoFocus
          />
        </Field>
        <Field label="Status">
          <Select
            value={status}
            onChange={(v) => setStatus(v as ProjectStatus)}
            options={PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />
        </Field>
        <Field label="Fase">
          <Input value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="Pre-Production" />
        </Field>
        <Field label="Deadline" hint="Optioneel">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Omschrijving" hint="Zichtbaar voor de klant in het portaal">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Wat gaan we doen?"
          />
        </Field>
      </Stack>
    </Sheet>
  );
}
