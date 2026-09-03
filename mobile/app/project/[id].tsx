import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/AuthContext";
import { useApi, useQuery } from "@/useApi";
import { BUCKETS, type Deliverable, type Message, type Project, type ProjectStatus } from "@/api";
import { pickImages } from "@/pickers";
import { useColors } from "@/ThemeContext";
import { dateFull, GUTTER, radius, timeAgo } from "@/theme";
import { PROJECT_STATUSES, STATUS_LABEL, STATUS_PROGRESS, STATUS_TONE } from "@/projectStatus";
import { Card, Chip, Divider, haptic, Press, Row, SectionLabel, Stack, Txt } from "@/ui/base";
import { Button, CheckRow, Field, Input, PickTarget, Segmented, Select } from "@/ui/form";
import { DateField } from "@/ui/DateField";
import { Ring } from "@/ui/data";
import { Gallery } from "@/ui/Gallery";
import { Empty, ErrorState, SkeletonList, useToast } from "@/ui/feedback";
import { HeaderAction, Screen } from "@/ui/Screen";
import { ActionSheet, ConfirmSheet, Sheet } from "@/ui/Sheet";

type Tab = "overview" | "gallery" | "messages";

/**
 * Project fields this screen writes.
 *
 * `meeting` widens to null because the server treats an explicit null as
 * "remove the meeting entirely" — a distinction the stored Project shape has no
 * way to express, since a removed meeting is simply absent.
 */
type ProjectPatch = Omit<Partial<Project>, "meeting"> & {
  meeting?: Project["meeting"] | null;
};

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const toast = useToast();

  const query = useQuery(() => api.project(id!), [api, id]);
  const project = query.data;

  const [tab, setTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** Single write path for every mutation on this screen. */
  async function patch(updates: ProjectPatch, successMessage?: string) {
    if (!project) return;
    const before = project;
    query.set({ ...project, ...updates } as Project);
    try {
      const saved = await api.updateProject(id!, updates);
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
      await api.deleteProject(id!);
      toast("Project verwijderd", "success");
      if (project) router.replace(`/client/${project.clientId}`);
      else router.replace("/clients");
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
      back
      fullBleedBottom
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      trailing={
        <HeaderAction label="Meer" icon="more-horizontal" onPress={() => setMenuOpen(true)} />
      }
      hero={
        project ? (
          <View style={{ marginBottom: 18 }}>
            <Segmented
              value={tab}
              onChange={(v) => setTab(v)}
              options={[
                { value: "overview", label: "Overzicht" },
                { value: "gallery", label: "Galerij", badge: project.galleryUrls?.length },
                { value: "messages", label: "Berichten" },
              ]}
            />
          </View>
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
        <MessagesTab projectId={id!} />
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={project?.title}
        actions={[
          { label: "Project bewerken", icon: "edit-2", onPress: () => setEditing(true) },
          {
            label: "Project verwijderen",
            icon: "trash-2",
            onPress: () => setConfirmDelete(true),
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
  onPatch: (u: ProjectPatch, msg?: string) => Promise<void>;
  onEdit: () => void;
}) {
  const c = useColors();
  const [addingDeliverable, setAddingDeliverable] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(false);

  const deliverables = project.deliverables ?? [];
  const doneCount = deliverables.filter((d) => d.done).length;

  // Prefer real deliverable progress; fall back to the status estimate when a
  // project has none, so the ring is never stuck at zero.
  const progress = deliverables.length
    ? doneCount / deliverables.length
    : STATUS_PROGRESS[project.status] ?? 0;

  return (
    <Stack gap={26}>
      <Animated.View entering={FadeInDown.springify().damping(20)}>
        <Card style={{ padding: 18 }}>
          <Row gap={16}>
            <Ring value={progress} size={62}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: c.fg,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {Math.round(progress * 100)}%
              </Text>
            </Ring>
            <View style={{ flex: 1 }}>
              <Row gap={7} style={{ flexWrap: "wrap", marginBottom: 7 }}>
                <Chip tone={STATUS_TONE[project.status] ?? "neutral"}>
                  {STATUS_LABEL[project.status] ?? project.status}
                </Chip>
                {!!project.phase && <Chip tone="neutral">{project.phase}</Chip>}
              </Row>
              <Txt variant="meta">
                {project.dueDate ? `Deadline ${dateFull(project.dueDate)}` : "Geen deadline"}
              </Txt>
            </View>
            <Press
              onPress={onEdit}
              accessibilityLabel="Bewerken"
              style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="edit-2" size={16} color={c.fg3} />
            </Press>
          </Row>

          {!!project.description && (
            <>
              <Divider style={{ marginVertical: 16 }} />
              <Text selectable style={{ fontSize: 13.5, color: c.fg2, lineHeight: 21 }}>
                {project.description}
              </Text>
            </>
          )}
        </Card>
      </Animated.View>

      {/* Status shortcut */}
      <View>
        <SectionLabel>Status wijzigen</SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: GUTTER }}
          style={{ marginHorizontal: -GUTTER }}
        >
          {PROJECT_STATUSES.map((s) => {
            const active = s.value === project.status;
            return (
              <Press
                key={s.value}
                feedback="select"
                onPress={() => !active && onPatch({ status: s.value }, `Status: ${s.label}`)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
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
                  {s.label}
                </Text>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      {/* Deliverables */}
      <View>
        <SectionLabel action={{ label: "Toevoegen", onPress: () => setAddingDeliverable(true) }}>
          {deliverables.length ? `Deliverables · ${doneCount}/${deliverables.length}` : "Deliverables"}
        </SectionLabel>

        {deliverables.length === 0 ? (
          <Card style={{ padding: 16 }}>
            <Txt variant="body" style={{ fontSize: 13 }}>
              Nog geen deliverables. Voeg toe wat je oplevert — de klant ziet de voortgang in het
              portaal.
            </Txt>
          </Card>
        ) : (
          <Card padded={false} style={{ paddingHorizontal: 14 }}>
            {deliverables.map((d, i) => (
              <View key={d.id}>
                {i > 0 && <Divider />}
                <Row gap={8}>
                  <CheckRow
                    checked={d.done}
                    onChange={() =>
                      onPatch({
                        deliverables: deliverables.map((x) =>
                          x.id === d.id ? { ...x, done: !x.done } : x
                        ),
                      })
                    }
                    label={
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: d.done ? c.fg3 : c.fg,
                          textDecorationLine: d.done ? "line-through" : "none",
                        }}
                      >
                        {d.name}
                      </Text>
                    }
                    meta={
                      d.count > 0 ? (
                        <Txt variant="meta" style={{ fontSize: 11.5, color: c.fg4 }}>
                          {`${d.count}×`}
                        </Txt>
                      ) : undefined
                    }
                  />
                  <Press
                    onPress={() =>
                      onPatch(
                        { deliverables: deliverables.filter((x) => x.id !== d.id) },
                        "Verwijderd"
                      )
                    }
                    feedback="warning"
                    accessibilityLabel="Verwijderen"
                    style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                  >
                    <Feather name="x" size={15} color={c.fg4} />
                  </Press>
                </Row>
              </View>
            ))}
          </Card>
        )}
      </View>

      {/* Afspraak */}
      <View>
        <SectionLabel
          action={{
            label: project.meeting?.date ? "Bewerken" : "Plannen",
            onPress: () => setEditingMeeting(true),
          }}
        >
          Afspraak
        </SectionLabel>

        {project.meeting?.date ? (
          <Card style={{ padding: 16 }}>
            <Row gap={13} align="flex-start">
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.sm,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: c.copperWash,
                }}
              >
                <Feather name="calendar" size={18} color={c.copper} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: c.fg }}>
                  {dateFull(project.meeting.date)}
                  {project.meeting.time ? ` · ${project.meeting.time}` : ""}
                </Text>
                {!!project.meeting.location && (
                  <Txt variant="meta" numberOfLines={2} style={{ marginTop: 3 }}>
                    {project.meeting.location}
                  </Txt>
                )}
                {!!project.meeting.notes && (
                  <Txt variant="body" style={{ fontSize: 12, marginTop: 6 }}>
                    {project.meeting.notes}
                  </Txt>
                )}
              </View>
            </Row>
          </Card>
        ) : (
          <Card style={{ padding: 16 }}>
            <Txt variant="body" style={{ fontSize: 13 }}>
              Geen afspraak gepland.
            </Txt>
          </Card>
        )}
      </View>

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
      id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
        <Button full onPress={submit}>
          Toevoegen
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Wat lever je op">
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Bijv. Bewerkte foto's"
            autoFocus
          />
        </Field>
        <Field label="Aantal" hint="0 als het aantal niet van toepassing is">
          <Input value={count} onChangeText={setCount} keyboardType="number-pad" />
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

  // Re-seed each time the sheet opens, so cancel-then-reopen shows what is
  // stored rather than the abandoned edit.
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
          {!!meeting?.date && (
            <Button variant="ghost" onPress={() => save(true)} disabled={busy}>
              Wissen
            </Button>
          )}
          <Button full busy={busy} onPress={() => save(false)} disabled={!date}>
            Opslaan
          </Button>
        </>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Row gap={10} align="flex-start">
          <View style={{ flex: 1 }}>
            <Field label="Datum">
              <DateField value={date} onChange={setDate} />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Tijd">
              <DateField value={time} onChange={setTime} mode="time" placeholder="Kies tijd" />
            </Field>
          </View>
        </Row>
        <Field label="Locatie">
          <Input
            value={location}
            onChangeText={setLocation}
            placeholder="Studio, adres of online"
          />
        </Field>
        <Field label="Notities" hint="Optioneel">
          <Input value={notes} onChangeText={setNotes} multiline />
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
  const [status, setStatus] = useState<ProjectStatus>(project.status);
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
        <Button full busy={busy} onPress={submit} disabled={!title.trim()}>
          Opslaan
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Titel">
          <Input value={title} onChangeText={setTitle} />
        </Field>
        <Field label="Status">
          <Select
            value={status}
            onChange={(v) => setStatus(v as ProjectStatus)}
            options={PROJECT_STATUSES}
            title="Status"
          />
        </Field>
        <Field label="Fase">
          <Input value={phase} onChangeText={setPhase} />
        </Field>
        <Field label="Deadline">
          <DateField value={dueDate} onChange={setDueDate} />
        </Field>
        <Field label="Omschrijving">
          <Input value={description} onChangeText={setDescription} multiline />
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
  onPatch: (u: ProjectPatch, msg?: string) => Promise<void>;
}) {
  const api = useApi();
  const toast = useToast();
  const urls = project.galleryUrls ?? [];

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  async function upload() {
    let assets;
    try {
      assets = await pickImages(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Kon fotobibliotheek niet openen", "error");
      return;
    }
    if (!assets?.length) return;

    setUploading(true);
    setProgress({ done: 0, total: assets.length });

    const uploaded: string[] = [];
    // Sequential rather than all at once: a phone on 4G pushing eight full
    // frames in parallel tends to time the slowest ones out, and this way a
    // partial failure still keeps everything that did land.
    for (const asset of assets) {
      try {
        uploaded.push(await api.upload(asset, BUCKETS.images));
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      } catch (err) {
        toast(err instanceof Error ? err.message : "Upload mislukt", "error");
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

  return (
    <Stack gap={20}>
      <PickTarget
        onPress={upload}
        busy={uploading}
        icon="image"
        label={
          uploading && progress.total
            ? `Uploaden… ${progress.done}/${progress.total}`
            : "Foto's toevoegen"
        }
        hint="Meerdere tegelijk kan"
      />

      {urls.length === 0 ? (
        <Empty
          icon="image"
          title="Galerij is leeg"
          body="Zodra je foto's toevoegt kan de klant ze bekijken en downloaden in het portaal."
        />
      ) : (
        <Gallery urls={urls} onDelete={(url) => setPendingRemove(url)} />
      )}

      <ConfirmSheet
        open={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => {
          if (!pendingRemove) return;
          onPatch({ galleryUrls: urls.filter((u) => u !== pendingRemove) }, "Foto verwijderd");
          setPendingRemove(null);
        }}
        title="Foto verwijderen?"
        body="De foto verdwijnt uit de galerij van de klant. Het bestand blijft in de opslag staan."
      />
    </Stack>
  );
}

// ── Berichten ─────────────────────────────────────────────────────────────

function MessagesTab({ projectId }: { projectId: string }) {
  const c = useColors();
  const api = useApi();
  const toast = useToast();
  const { user } = useAuth();
  const query = useQuery(() => api.messages(projectId), [api, projectId]);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const messages = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [query.data]
  );

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setDraft("");

    // Optimistic bubble so the thread reacts instantly; the temporary id is
    // swapped for the server's copy on success.
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
          icon="send"
          title="Nog geen berichten"
          body="Stuur de klant een update — die verschijnt direct in hun portaal."
        />
      ) : (
        <Stack gap={10}>
          {messages.map((m, i) => {
            const mine = m.senderRole === "pdc";
            return (
              <Animated.View
                key={m.id}
                entering={FadeInDown.delay(Math.min(i, 10) * 25).springify().damping(20)}
                style={{ alignItems: mine ? "flex-end" : "flex-start" }}
              >
                <View
                  style={{
                    maxWidth: "84%",
                    padding: 12,
                    borderRadius: radius.lg,
                    // The corner nearest the sender is squared off — the
                    // cheapest way to make a bubble point at someone.
                    borderBottomRightRadius: mine ? 6 : radius.lg,
                    borderBottomLeftRadius: mine ? radius.lg : 6,
                    backgroundColor: mine ? c.copperWash : c.surface2,
                    borderWidth: StyleSheet.hairlineWidth * 2,
                    borderColor: mine ? c.copper : c.line,
                    opacity: m.id.startsWith("pending-") ? 0.6 : 1,
                  }}
                >
                  <Text selectable style={{ fontSize: 14, color: c.fg, lineHeight: 21 }}>
                    {m.content}
                  </Text>
                  <Txt variant="meta" style={{ fontSize: 10, marginTop: 5, color: c.fg4 }}>
                    {`${mine ? "Jij" : m.senderName} · ${timeAgo(m.createdAt)}`}
                  </Txt>
                </View>
              </Animated.View>
            );
          })}
        </Stack>
      )}

      <Row gap={8} align="flex-end" style={{ paddingTop: 4 }}>
        <View style={{ flex: 1 }}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder="Bericht aan de klant…"
            multiline
            style={{ minHeight: 46, borderRadius: radius.lg }}
          />
        </View>
        <Press
          onPress={send}
          disabled={!draft.trim() || sending}
          accessibilityLabel="Versturen"
          style={{
            width: 46,
            height: 46,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.copper,
          }}
        >
          <Feather name="send" size={18} color="#1a0c04" />
        </Press>
      </Row>
    </Stack>
  );
}
