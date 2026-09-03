import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppData } from "@/AppData";
import { useApi, useQuery } from "@/useApi";
import type { Project, ProjectStatus } from "@/api";
import { useColors } from "@/ThemeContext";
import { dateFull, timeAgo } from "@/theme";
import { PROJECT_STATUSES, STATUS_LABEL, STATUS_TONE } from "@/projectStatus";
import { Avatar, Card, Chip, Divider, haptic, Press, Row, SectionLabel, Stack, Txt } from "@/ui/base";
import { Button, Field, Input, Select } from "@/ui/form";
import { DateField } from "@/ui/DateField";
import { Empty, ErrorState, SkeletonList, useToast } from "@/ui/feedback";
import { HeaderAction, Screen } from "@/ui/Screen";
import { ActionSheet, ConfirmSheet, Sheet } from "@/ui/Sheet";

export default function ClientDetailScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const toast = useToast();
  const { refresh: refreshGlobal } = useAppData();

  const query = useQuery(() => api.client(id!), [api, id]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const client = query.data?.client;
  const projects = query.data?.projects ?? [];

  async function copyEmail() {
    if (!client) return;
    await Clipboard.setStringAsync(client.email);
    haptic("success");
    toast("E-mailadres gekopieerd", "success");
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteClient(id!);
      toast("Klant verwijderd", "success");
      // The clients list is shared state; refresh it so the row is already gone
      // by the time the pop animation lands.
      refreshGlobal();
      router.replace("/clients");
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
      back
      fullBleedBottom
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      trailing={
        <HeaderAction label="Meer" icon="more-horizontal" onPress={() => setMenuOpen(true)} />
      }
    >
      {query.loading ? (
        <SkeletonList rows={4} />
      ) : query.error || !client ? (
        <ErrorState message={query.error ?? "Klant niet gevonden"} onRetry={query.refresh} />
      ) : (
        <Stack gap={26}>
          <Animated.View entering={FadeInDown.springify().damping(20)}>
            <Card style={{ padding: 18 }}>
              <Row gap={14}>
                <Avatar name={client.name} size={54} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "700", color: c.fg }}>
                    {client.name}
                  </Text>
                  {!!client.company && (
                    <Txt variant="meta" numberOfLines={1} style={{ fontSize: 13, marginTop: 2 }}>
                      {client.company}
                    </Txt>
                  )}
                </View>
              </Row>

              <Divider style={{ marginVertical: 16 }} />

              <Stack gap={12}>
                <Row gap={10}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="eyebrow" style={{ fontSize: 9.5, letterSpacing: 1.6 }}>
                      E-mail
                    </Txt>
                    <Text selectable numberOfLines={1} style={{ fontSize: 13.5, color: c.fg, marginTop: 3 }}>
                      {client.email}
                    </Text>
                  </View>
                  <Press
                    onPress={copyEmail}
                    accessibilityLabel="E-mail kopiëren"
                    style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
                  >
                    <Feather name="copy" size={15} color={c.fg3} />
                  </Press>
                </Row>

                <Divider />

                <Row gap={16}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="eyebrow" style={{ fontSize: 9.5, letterSpacing: 1.6 }}>
                      Klant sinds
                    </Txt>
                    <Text style={{ fontSize: 13.5, color: c.fg, marginTop: 3 }}>
                      {dateFull(client.createdAt)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="eyebrow" style={{ fontSize: 9.5, letterSpacing: 1.6 }}>
                      Laatst actief
                    </Txt>
                    <Text style={{ fontSize: 13.5, color: c.fg, marginTop: 3 }}>
                      {timeAgo(client.lastSignIn)}
                    </Text>
                  </View>
                </Row>
              </Stack>

              <Button
                variant="secondary"
                full
                size="sm"
                icon="mail"
                onPress={() => Linking.openURL(`mailto:${client.email}`)}
                style={{ marginTop: 16 }}
              >
                Mail versturen
              </Button>
            </Card>
          </Animated.View>

          <View>
            <SectionLabel action={{ label: "Nieuw", onPress: () => setCreating(true) }}>
              {`Projecten · ${projects.length}`}
            </SectionLabel>

            {projects.length === 0 ? (
              <Empty
                icon="folder"
                title="Nog geen projecten"
                body="Maak een project aan zodat deze klant voortgang, planning en galerij kan volgen in het portaal."
                action={{ label: "Project aanmaken", onPress: () => setCreating(true) }}
              />
            ) : (
              <Stack gap={9}>
                {projects.map((p, i) => (
                  <Animated.View
                    key={p.id}
                    entering={FadeInDown.delay(Math.min(i, 8) * 40).springify().damping(20)}
                  >
                    <Press onPress={() => router.push(`/project/${p.id}`)} scale={0.985}>
                      <Card style={{ padding: 14 }}>
                        <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: "600", color: c.fg }}>
                          {p.title}
                        </Text>
                        <Txt variant="meta" numberOfLines={1} style={{ marginTop: 3 }}>
                          {p.phase || "Geen fase"}
                          {p.dueDate ? ` · ${dateFull(p.dueDate)}` : ""}
                        </Txt>
                        <Row gap={7} style={{ marginTop: 9, flexWrap: "wrap" }}>
                          <Chip tone={STATUS_TONE[p.status] ?? "neutral"}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </Chip>
                          {!!p.galleryUrls?.length && (
                            <Chip tone="neutral">{`${p.galleryUrls.length} foto's`}</Chip>
                          )}
                          {!!p.deliverables?.length && (
                            <Chip tone="neutral">
                              {`${p.deliverables.filter((d) => d.done).length}/${p.deliverables.length} klaar`}
                            </Chip>
                          )}
                        </Row>
                      </Card>
                    </Press>
                  </Animated.View>
                ))}
              </Stack>
            )}
          </View>
        </Stack>
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={client?.name}
        actions={[
          { label: "Nieuw project", icon: "plus", onPress: () => setCreating(true) },
          {
            label: "Klant verwijderen",
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
        title={`${client?.name ?? "Klant"} verwijderen?`}
        body="Het account, alle projecten, berichten en galerijen verdwijnen definitief."
      />

      <NewProjectSheet
        open={creating}
        clientId={id!}
        onClose={() => setCreating(false)}
        onCreated={(project) => {
          setCreating(false);
          query.refresh();
          refreshGlobal();
          router.push(`/project/${project.id}`);
        }}
      />
    </Screen>
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
        <Button full busy={busy} onPress={submit}>
          Aanmaken
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Titel">
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="Bijv. Porsche 911 — studio shoot"
            autoFocus
          />
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
          <Input value={phase} onChangeText={setPhase} placeholder="Pre-Production" />
        </Field>
        <Field label="Deadline" hint="Optioneel">
          <DateField value={dueDate} onChange={setDueDate} />
        </Field>
        <Field label="Omschrijving" hint="Zichtbaar voor de klant in het portaal">
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Wat gaan we doen?"
            multiline
          />
        </Field>
      </Stack>
    </Sheet>
  );
}
