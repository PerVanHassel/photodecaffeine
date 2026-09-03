import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useAppData } from "@/AppData";
import { useApi } from "@/useApi";
import type { Client } from "@/api";
import { useColors } from "@/ThemeContext";
import { timeAgo } from "@/theme";
import { Avatar, Card, Chip, Row, Stack, Txt } from "@/ui/base";
import { SearchField, Segmented } from "@/ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "@/ui/feedback";
import { Screen } from "@/ui/Screen";
import { ConfirmSheet } from "@/ui/Sheet";
import { SwipeRow } from "@/ui/SwipeRow";
import { Press } from "@/ui/base";

type Sort = "recent" | "name" | "projects";

const SORTERS: Record<Sort, (a: Client, b: Client) => number> = {
  recent: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  name: (a, b) => a.name.localeCompare(b.name, "nl"),
  projects: (a, b) => b.projectCount - a.projectCount,
};

export default function ClientsScreen() {
  const c = useColors();
  const router = useRouter();
  const api = useApi();
  const toast = useToast();
  const { clients, loading, error, refresh, setClients } = useAppData();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? clients.filter((cl) =>
          [cl.name, cl.company, cl.email].some((f) => (f || "").toLowerCase().includes(q))
        )
      : clients;
    return [...filtered].sort(SORTERS[sort]);
  }, [clients, query, sort]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const target = pendingDelete;
    const before = clients;
    // Remove locally first: a row that lingers for a second after a delete
    // reads as "it didn't work" and invites a second tap.
    setClients((list) => list.filter((cl) => cl.id !== target.id));
    setPendingDelete(null);

    try {
      await api.deleteClient(target.id);
      toast(`${target.name} verwijderd`, "success");
    } catch (err) {
      setClients(() => before);
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen
      title="Klanten"
      eyebrow={`${clients.length} ${clients.length === 1 ? "account" : "accounts"}`}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      hero={
        <Stack gap={12} style={{ marginBottom: 18 }}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Naam, bedrijf of e-mail" />
          <Segmented
            value={sort}
            onChange={(v) => setSort(v)}
            size="sm"
            options={[
              { value: "recent", label: "Nieuwste" },
              { value: "name", label: "A–Z" },
              { value: "projects", label: "Projecten" },
            ]}
          />
        </Stack>
      }
    >
      {loading && !clients.length ? (
        <SkeletonList rows={6} />
      ) : error && !clients.length ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : visible.length === 0 ? (
        <Empty
          icon="users"
          title={query ? "Niets gevonden" : "Nog geen klanten"}
          body={
            query
              ? `Geen klant komt overeen met “${query}”.`
              : "Klantaccounts verschijnen hier zodra ze zijn aangemaakt."
          }
          action={query ? { label: "Zoekopdracht wissen", onPress: () => setQuery("") } : undefined}
        />
      ) : (
        <Stack gap={9}>
          {visible.map((cl, i) => (
            <Animated.View
              key={cl.id}
              layout={LinearTransition.springify().damping(22)}
              entering={FadeInDown.delay(Math.min(i, 9) * 30).springify().damping(20)}
            >
              <SwipeRow
                actions={[
                  {
                    label: "Verwijder",
                    icon: "trash-2",
                    onPress: () => setPendingDelete(cl),
                    tone: c.danger,
                  },
                ]}
              >
                <Press onPress={() => router.push(`/client/${cl.id}`)} scale={0.985}>
                  <Card style={{ padding: 14 }}>
                    <Row gap={12}>
                      <Avatar name={cl.name} size={40} />
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: "600", color: c.fg }}>
                          {cl.name}
                        </Text>
                        <Txt variant="meta" numberOfLines={1} style={{ marginTop: 2 }}>
                          {cl.company || cl.email}
                        </Txt>
                        <Row gap={8} style={{ marginTop: 7 }}>
                          <Chip tone={cl.projectCount ? "copper" : "neutral"}>
                            {cl.projectCount} {cl.projectCount === 1 ? "project" : "projecten"}
                          </Chip>
                          <Txt variant="meta" style={{ fontSize: 10.5, color: c.fg4 }}>
                            Actief {timeAgo(cl.lastSignIn)}
                          </Txt>
                        </Row>
                      </View>
                      <Feather name="chevron-right" size={17} color={c.fg4} />
                    </Row>
                  </Card>
                </Press>
              </SwipeRow>
            </Animated.View>
          ))}
        </Stack>
      )}

      <ConfirmSheet
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title={`${pendingDelete?.name ?? ""} verwijderen?`}
        body="Het account en alle bijbehorende projecten, berichten en galerijen worden definitief verwijderd. Dit kan niet ongedaan gemaakt worden."
      />
    </Screen>
  );
}
