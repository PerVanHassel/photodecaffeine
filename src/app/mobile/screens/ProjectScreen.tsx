import { AnimatePresence, motion } from "motion/react";
import {
  CalendarClock,
  Check,
  ImagePlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useApi, useQuery } from "../useApi";
import { BUCKETS, type Deliverable, type Message, type Project } from "../api";
import { c, dateFull, GUTTER, radius, spring, timeAgo } from "../theme";
import { haptic } from "../haptics";
import { Card, Chip, Divider, Ellipsis, Press, Row, SectionLabel, Stack } from "../ui/base";
import { Button, CheckRow, Field, FilePicker, Input, Segmented, Select, Textarea } from "../ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "../ui/feedback";
import { Ring } from "../ui/data";
import { HeaderAction, Screen } from "../ui/Screen";
import { ActionSheet, ConfirmSheet, Sheet } from "../ui/Sheet";
import { PROJECT_STATUSES, STATUS_LABEL, STATUS_PROGRESS, STATUS_TONE } from "./projectStatus";

type Tab = "overview" | "gallery" | "messages";

export function ProjectScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const toast = useToast();

  const query = useQuery(() => api.project(id), [api, id]);
  const project = query.data;

  const [tab, setTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** Single write path for every mutation on this screen. */
  async function patch(updates: Partial<Project>, successMessage?: string) {
    if (!project) return;
    const before = project;
    query.set({ ...project, ...updates } as Project);
    try {
      const saved = await api.updateProject(id, updates);
      query.set(saved);
      if (successMessage) toast(successMessage, "success");
    } catch (err) {
      query.set(before);
      toast(err instanceof Error ? err.message : "Opslaan mislukt", "error");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteProject(id);
      toast("Project verwijderd", "success");
      navigate(project ? `/app/client/${project.clientId}` : "/app/clients", { replace: true });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Screen
      title={project?.title ?? "Project"}
      eyebrow={project ? STATUS_LABEL[project.status] ?? project.status : undefined}
      back={project ? `/app/client/${project.clientId}` : true}
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
      hero={
        project ? (
          <div style={{ marginBottom: 18 }}>
            <Segmented
              value={tab}
              onChange={(v) => setTab(v)}
              options={[
                { value: "overview", label: "Overzicht" },
                { value: "gallery", label: "Galerij", badge: project.galleryUrls?.length },
                { value: "messages", label: "Berichten" },
              ]}
            />
          </div>
        ) : undefined
      }
    >
      {query.loading ? (
        <SkeletonList rows={4} />
      ) : query.error || !project ? (
        <ErrorState message={query.error ?? "Project niet gevonden"} onRetry={query.refresh} />
      ) : tab === "overview" ? (
        <OverviewTab project={project} onPatch={patch} onEdit={() => setEditing(true)} />
      ) : tab === "gallery" ? (
        <GalleryTab project={project} onPatch={patch} />
      ) : (
        <MessagesTab projectId={id} />
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={project?.title}
        actions={[
          { label: "Project bewerken", icon: <Pencil size={17} />, onClick: () => setEditing(true) },
          {
            label: "Project verwijderen",
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
        title="Project verwijderen?"
        body="Het project, de berichten en de galerij verdwijnen definitief uit het klantportaal."
      />

      {project && (
        <EditProjectSheet
          open={editing}
          project={project}
          onClose={() => setEditing(false)}
          onSave={async (updates) => {
            await patch(updates, "Opgeslagen");
            setEditing(false);
          }}
        />
      )}
    </Screen>
  );
}

// ── Overzicht ─────────────────────────────────────────────────────────────

function OverviewTab({
  project,
  onPatch,
  onEdit,
}: {
  project: Project;
  onPatch: (u: Partial<Project>, msg?: string) => Promise<void>;
  onEdit: () => void;
}) {
  const [addingDeliverable, setAddingDeliverable] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(false);

  const deliverables = project.deliverables ?? [];
  const doneCount = deliverables.filter((d) => d.done).length;

  // Prefer real deliverable progress; fall back to the status-derived estimate
  // when a project has none, so the ring is never stuck at zero.
  const progress = deliverables.length
    ? doneCount / deliverables.length
    : STATUS_PROGRESS[project.status] ?? 0;

  function toggleDeliverable(target: Deliverable) {
    onPatch({
      deliverables: deliverables.map((d) =>
        d.id === target.id ? { ...d, done: !d.done } : d
      ),
    });
  }

  function removeDeliverable(target: Deliverable) {
    onPatch({ deliverables: deliverables.filter((d) => d.id !== target.id) }, "Verwijderd");
  }

  return (
    <Stack gap={26}>
      {/* Status card */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring.smooth}>
        <Card style={{ padding: 18 }}>
          <Row gap={16}>
            <Ring value={progress} size={62} tone={c.copper}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: c.fg,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Math.round(progress * 100)}%
              </span>
            </Ring>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Row gap={7} style={{ flexWrap: "wrap", marginBottom: 7 }}>
                <Chip tone={STATUS_TONE[project.status] ?? "neutral"}>
                  {STATUS_LABEL[project.status] ?? project.status}
                </Chip>
                {project.phase && <Chip tone="neutral">{project.phase}</Chip>}
              </Row>
              <div style={{ fontSize: 12, color: c.fg3 }}>
                {project.dueDate ? `Deadline ${dateFull(project.dueDate)}` : "Geen deadline"}
              </div>
            </div>
            <Press
              onClick={onEdit}
              aria-label="Bewerken"
              style={{ width: 40, height: 40, display: "grid", placeItems: "center", color: c.fg3 }}
            >
              <Pencil size={16} />
            </Press>
          </Row>

          {project.description && (
            <>
              <Divider style={{ margin: "16px 0" }} />
              <div
                className="m-selectable"
                style={{ fontSize: 13.5, color: c.fg2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}
              >
                {project.description}
              </div>
            </>
          )}
        </Card>
      </motion.div>

      {/* Status shortcut */}
      <section>
        <SectionLabel>Status wijzigen</SectionLabel>
        <div className="m-hscroll" style={{ gap: 8, marginLeft: -GUTTER, marginRight: -GUTTER, padding: `2px ${GUTTER}px` }}>
          {PROJECT_STATUSES.map((s) => {
            const active = s.value === project.status;
            return (
              <Press
                key={s.value}
                onClick={() => !active && onPatch({ status: s.value }, `Status: ${s.label}`)}
                feedback="select"
                style={{
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  padding: "10px 16px",
                  borderRadius: radius.pill,
                  border: `1px solid ${active ? c.copper : c.line}`,
                  backgroundColor: active ? c.copperWash : c.surface,
                  color: active ? c.copper : c.fg3,
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </Press>
            );
          })}
        </div>
      </section>

      {/* Deliverables */}
      <section>
        <SectionLabel action={{ label: "Toevoegen", onClick: () => setAddingDeliverable(true) }}>
          Deliverables {deliverables.length ? `· ${doneCount}/${deliverables.length}` : ""}
        </SectionLabel>

        {deliverables.length === 0 ? (
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: c.fg3, lineHeight: 1.5 }}>
              Nog geen deliverables. Voeg toe wat je oplevert — de klant ziet de voortgang in het
              portaal.
            </div>
          </Card>
        ) : (
          <Card padded={false} style={{ padding: "4px 14px" }}>
            {deliverables.map((d, i) => (
              <div key={d.id}>
                {i > 0 && <Divider />}
                <Row gap={8}>
                  <CheckRow
                    checked={d.done}
                    onChange={() => toggleDeliverable(d)}
                    label={
                      <Ellipsis
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: d.done ? c.fg3 : c.fg,
                          textDecoration: d.done ? "line-through" : "none",
                        }}
                      >
                        {d.name}
                      </Ellipsis>
                    }
                    meta={
                      d.count > 0 ? (
                        <span style={{ fontSize: 11.5, color: c.fg4, fontWeight: 600 }}>
                          {d.count}×
                        </span>
                      ) : undefined
                    }
                  />
                  <Press
                    onClick={() => removeDeliverable(d)}
                    feedback="warning"
                    aria-label="Verwijderen"
                    style={{ width: 36, height: 36, display: "grid", placeItems: "center", color: c.fg4 }}
                  >
                    <X size={15} />
                  </Press>
                </Row>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* Meeting */}
      <section>
        <SectionLabel
          action={{
            label: project.meeting?.date ? "Bewerken" : "Plannen",
            onClick: () => setEditingMeeting(true),
          }}
        >
          Afspraak
        </SectionLabel>

        {project.meeting?.date ? (
          <Card style={{ padding: 16 }}>
            <Row gap={13}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: radius.sm,
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: c.copperWash,
                  color: c.copper,
                }}
              >
                <CalendarClock size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 650, color: c.fg }}>
                  {dateFull(project.meeting.date)}
                  {project.meeting.time ? ` · ${project.meeting.time}` : ""}
                </div>
                {project.meeting.location && (
                  <Ellipsis style={{ fontSize: 12, color: c.fg3, marginTop: 3 }}>
                    {project.meeting.location}
                  </Ellipsis>
                )}
                {project.meeting.notes && (
                  <div style={{ fontSize: 12, color: c.fg3, marginTop: 6, lineHeight: 1.5 }}>
                    {project.meeting.notes}
                  </div>
                )}
              </div>
            </Row>
          </Card>
        ) : (
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: c.fg3 }}>Geen afspraak gepland.</div>
          </Card>
        )}
      </section>

      <AddDeliverableSheet
        open={addingDeliverable}
        onClose={() => setAddingDeliverable(false)}
        onAdd={(deliverable) => {
          onPatch({ deliverables: [...deliverables, deliverable] }, "Toegevoegd");
          setAddingDeliverable(false);
        }}
      />

      <MeetingSheet
        open={editingMeeting}
        meeting={project.meeting}
        onClose={() => setEditingMeeting(false)}
        onSave={async (meeting) => {
          await onPatch({ meeting }, meeting ? "Afspraak opgeslagen" : "Afspraak verwijderd");
          setEditingMeeting(false);
        }}
      />
    </Stack>
  );
}

function AddDeliverableSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (d: Deliverable) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [count, setCount] = useState("1");

  function submit() {
    if (!name.trim()) {
      toast("Geef de deliverable een naam", "error");
      return;
    }
    onAdd({
      // crypto.randomUUID needs a secure context; the app is served over HTTPS
      // in every real deployment, but the fallback keeps localhost working.
      id: globalThis.crypto?.randomUUID?.() ?? `d-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      count: Number(count) || 0,
      done: false,
    });
    setName("");
    setCount("1");
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Deliverable toevoegen"
      footer={
        <Button full onClick={submit}>
          Toevoegen
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Wat lever je op">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bijv. Bewerkte foto's"
            autoFocus
          />
        </Field>
        <Field label="Aantal" hint="0 als het aantal niet van toepassing is">
          <Input
            type="number"
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </Field>
      </Stack>
    </Sheet>
  );
}

function MeetingSheet({
  open,
  meeting,
  onClose,
  onSave,
}: {
  open: boolean;
  meeting: Project["meeting"];
  onClose: () => void;
  onSave: (m: Project["meeting"] | null) => Promise<void>;
}) {
  const [date, setDate] = useState(meeting?.date ?? "");
  const [time, setTime] = useState(meeting?.time ?? "");
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [busy, setBusy] = useState(false);

  // Re-seed the form each time the sheet opens, so a cancel followed by a
  // reopen shows what's stored rather than the abandoned edit.
  useEffect(() => {
    if (!open) return;
    setDate(meeting?.date ?? "");
    setTime(meeting?.time ?? "");
    setLocation(meeting?.location ?? "");
    setNotes(meeting?.notes ?? "");
  }, [open, meeting]);

  async function save(clear = false) {
    setBusy(true);
    // The server treats an explicit null as "remove the meeting entirely".
    await onSave(clear ? null : { date, time, location, notes });
    setBusy(false);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Afspraak"
      subtitle="De klant ziet dit in het portaal."
      footer={
        <>
          {meeting?.date && (
            <Button variant="ghost" onClick={() => save(true)} disabled={busy}>
              Wissen
            </Button>
          )}
          <Button full busy={busy} onClick={() => save(false)} disabled={!date}>
            Opslaan
          </Button>
        </>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Row gap={10}>
          <div style={{ flex: 1 }}>
            <Field label="Datum">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Tijd">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
        </Row>
        <Field label="Locatie">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Studio, adres of online"
          />
        </Field>
        <Field label="Notities" hint="Optioneel">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
      </Stack>
    </Sheet>
  );
}

function EditProjectSheet({
  open,
  project,
  onClose,
  onSave,
}: {
  open: boolean;
  project: Project;
  onClose: () => void;
  onSave: (u: Partial<Project>) => Promise<void>;
}) {
  const [title, setTitle] = useState(project.title);
  const [status, setStatus] = useState(project.status);
  const [phase, setPhase] = useState(project.phase ?? "");
  const [dueDate, setDueDate] = useState(project.dueDate ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(project.title);
    setStatus(project.status);
    setPhase(project.phase ?? "");
    setDueDate(project.dueDate ?? "");
    setDescription(project.description ?? "");
  }, [open, project]);

  async function submit() {
    setBusy(true);
    await onSave({ title: title.trim(), status, phase, dueDate, description });
    setBusy(false);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Project bewerken"
      footer={
        <Button full busy={busy} onClick={submit} disabled={!title.trim()}>
          Opslaan
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Titel">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Status">
          <Select
            value={status}
            onChange={(v) => setStatus(v as Project["status"])}
            options={PROJECT_STATUSES}
          />
        </Field>
        <Field label="Fase">
          <Input value={phase} onChange={(e) => setPhase(e.target.value)} />
        </Field>
        <Field label="Deadline">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Omschrijving">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </Field>
      </Stack>
    </Sheet>
  );
}

// ── Galerij ───────────────────────────────────────────────────────────────

function GalleryTab({
  project,
  onPatch,
}: {
  project: Project;
  onPatch: (u: Partial<Project>, msg?: string) => Promise<void>;
}) {
  const api = useApi();
  const toast = useToast();
  const urls = project.galleryUrls ?? [];

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  async function upload(files: File[]) {
    setUploading(true);
    setProgress({ done: 0, total: files.length });

    const uploaded: string[] = [];
    // Sequential rather than Promise.all: a phone on 4G uploading eight full
    // resolution frames at once tends to time the slowest ones out, and this
    // way a partial failure still keeps everything that did land.
    for (const file of files) {
      try {
        uploaded.push(await api.upload(file, BUCKETS.images));
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      } catch (err) {
        toast(
          err instanceof Error ? `${file.name}: ${err.message}` : `${file.name} mislukt`,
          "error"
        );
      }
    }

    if (uploaded.length) {
      await onPatch(
        { galleryUrls: [...urls, ...uploaded] },
        `${uploaded.length} foto${uploaded.length === 1 ? "" : "'s"} toegevoegd`
      );
    }

    setUploading(false);
    setProgress({ done: 0, total: 0 });
  }

  function remove(url: string) {
    onPatch({ galleryUrls: urls.filter((u) => u !== url) }, "Foto verwijderd");
    setPendingRemove(null);
    setLightbox(null);
  }

  return (
    <Stack gap={20}>
      <FilePicker onFiles={upload} accept="image/*" multiple busy={uploading}>
        <div
          className="m-glass"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 96,
            borderRadius: radius.lg,
            borderStyle: "dashed",
            borderColor: c.line2,
            color: c.fg3,
          }}
        >
          {uploading ? (
            <>
              <span style={{ fontSize: 13, fontWeight: 650, color: c.fg }}>
                Uploaden… {progress.done}/{progress.total}
              </span>
              <div style={{ width: 140, height: 4, borderRadius: 999, backgroundColor: c.line }}>
                <motion.div
                  animate={{
                    width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%",
                  }}
                  transition={spring.smooth}
                  style={{ height: "100%", borderRadius: 999, backgroundColor: c.copper }}
                />
              </div>
            </>
          ) : (
            <>
              <ImagePlus size={22} color={c.copper} />
              <span style={{ fontSize: 13, fontWeight: 650, color: c.fg }}>Foto's toevoegen</span>
              <span style={{ fontSize: 11.5, color: c.fg4 }}>Meerdere tegelijk kan</span>
            </>
          )}
        </div>
      </FilePicker>

      {urls.length === 0 ? (
        <Empty
          icon={<ImagePlus size={22} />}
          title="Galerij is leeg"
          body="Zodra je foto's toevoegt kan de klant ze bekijken en downloaden in het portaal."
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {urls.map((url, i) => (
            <motion.button
              key={url}
              type="button"
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring.smooth, delay: Math.min(i, 12) * 0.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                haptic("tap");
                setLightbox(url);
              }}
              style={{
                aspectRatio: "1",
                border: `1px solid ${c.line}`,
                borderRadius: radius.sm,
                overflow: "hidden",
                padding: 0,
                background: c.surface,
                cursor: "pointer",
              }}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </motion.button>
          ))}
        </div>
      )}

      <Lightbox
        url={lightbox}
        onClose={() => setLightbox(null)}
        onDelete={() => setPendingRemove(lightbox)}
      />

      <ConfirmSheet
        open={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => pendingRemove && remove(pendingRemove)}
        title="Foto verwijderen?"
        body="De foto verdwijnt uit de galerij van de klant. Het bestand blijft in de opslag staan."
      />
    </Stack>
  );
}

function Lightbox({
  url,
  onClose,
  onDelete,
}: {
  url: string | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <AnimatePresence>
      {url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 250,
            backgroundColor: "rgba(0,0,0,0.94)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "calc(env(safe-area-inset-top, 0px) + 8px) 8px 8px",
            }}
          >
            <Press
              onClick={onClose}
              aria-label="Sluiten"
              style={{ width: 44, height: 44, display: "grid", placeItems: "center", color: "#fff" }}
            >
              <X size={22} />
            </Press>
            <Press
              onClick={onDelete}
              feedback="warning"
              aria-label="Verwijderen"
              style={{ width: 44, height: 44, display: "grid", placeItems: "center", color: c.danger }}
            >
              <Trash2 size={20} />
            </Press>
          </div>

          <motion.img
            src={url}
            alt=""
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring.smooth}
            // Drag down to dismiss, matching the sheet gesture elsewhere.
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.5}
            onDragEnd={(_, info) => Math.abs(info.offset.y) > 110 && onClose()}
            style={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              objectFit: "contain",
              padding: "0 8px calc(env(safe-area-inset-bottom, 0px) + 16px)",
              boxSizing: "border-box",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Berichten ─────────────────────────────────────────────────────────────

function MessagesTab({ projectId }: { projectId: string }) {
  const api = useApi();
  const toast = useToast();
  const { user } = useAuth();
  const query = useQuery(() => api.messages(projectId), [api, projectId]);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [query.data]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setDraft("");

    // Optimistic bubble so the thread reacts instantly; the id is temporary and
    // gets replaced by the server's copy on success.
    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      projectId,
      senderId: user?.id ?? "",
      senderName: user?.user_metadata?.name ?? "PDC",
      senderRole: "pdc",
      content,
      createdAt: new Date().toISOString(),
    };
    query.set((prev) => [...(prev ?? []), optimistic]);

    try {
      const saved = await api.sendMessage(projectId, content);
      query.set((prev) => (prev ?? []).map((m) => (m.id === optimistic.id ? saved : m)));
      haptic("success");
    } catch (err) {
      query.set((prev) => (prev ?? []).filter((m) => m.id !== optimistic.id));
      setDraft(content);
      toast(err instanceof Error ? err.message : "Versturen mislukt", "error");
    } finally {
      setSending(false);
    }
  }

  if (query.loading) return <SkeletonList rows={4} height={56} />;

  return (
    <Stack gap={14}>
      {messages.length === 0 ? (
        <Empty
          icon={<Send size={22} />}
          title="Nog geen berichten"
          body="Stuur de klant een update — die verschijnt direct in hun portaal."
        />
      ) : (
        <Stack gap={10}>
          {messages.map((m, i) => {
            const mine = m.senderRole === "pdc";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...spring.smooth, delay: Math.min(i, 10) * 0.02 }}
                style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}
              >
                <div
                  className="m-selectable"
                  style={{
                    maxWidth: "82%",
                    padding: "11px 14px",
                    borderRadius: radius.lg,
                    // The corner nearest the sender is squared off — the
                    // cheapest way to make a bubble read as pointing at someone.
                    borderBottomRightRadius: mine ? 6 : radius.lg,
                    borderBottomLeftRadius: mine ? radius.lg : 6,
                    backgroundColor: mine ? c.copperWash : c.surface2,
                    border: `1px solid ${mine ? "color-mix(in srgb, var(--m-copper) 28%, transparent)" : c.line}`,
                    opacity: m.id.startsWith("pending-") ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontSize: 14, color: c.fg, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize: 10, color: c.fg4, marginTop: 5, fontWeight: 500 }}>
                    {mine ? "Jij" : m.senderName} · {timeAgo(m.createdAt)}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </Stack>
      )}

      <Row gap={8} align="flex-end" style={{ paddingTop: 4 }}>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Bericht aan de klant…"
          rows={1}
          style={{ borderRadius: radius.lg, minHeight: 46, paddingTop: 13, paddingBottom: 13 }}
        />
        <Press
          onClick={send}
          disabled={!draft.trim() || sending}
          feedback="tap"
          aria-label="Versturen"
          style={{
            width: 46,
            height: 46,
            flexShrink: 0,
            borderRadius: radius.md,
            display: "grid",
            placeItems: "center",
            backgroundImage: `linear-gradient(160deg, var(--m-copper-hi), var(--m-copper))`,
            color: "#1a0c04",
          }}
        >
          <Send size={18} />
        </Press>
      </Row>
    </Stack>
  );
}
