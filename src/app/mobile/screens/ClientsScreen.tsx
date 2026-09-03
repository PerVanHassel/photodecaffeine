import { motion } from "motion/react";
import { ChevronRight, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAppData } from "../AppData";
import { useApi } from "../useApi";
import type { Client } from "../api";
import { c, spring, timeAgo } from "../theme";
import { Avatar, Card, Chip, Ellipsis, Row, Stack } from "../ui/base";
import { SearchField, Segmented } from "../ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "../ui/feedback";
import { Screen } from "../ui/Screen";
import { ConfirmSheet } from "../ui/Sheet";
import { SwipeRow } from "../ui/SwipeRow";

type Sort = "recent" | "name" | "projects";

const SORTERS: Record<Sort, (a: Client, b: Client) => number> = {
  recent: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  name: (a, b) => a.name.localeCompare(b.name, "nl"),
  projects: (a, b) => b.projectCount - a.projectCount,
};

export function ClientsScreen() {
  const navigate = useNavigate();
  const api = useApi();
  const toast = useToast();
  const { clients, loading, error, refresh, setClients } = useAppData();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? clients.filter((cl) =>
          [cl.name, cl.company, cl.email].some((field) => (field || "").toLowerCase().includes(q))
        )
      : clients;
    return [...filtered].sort(SORTERS[sort]);
  }, [clients, query, sort]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const target = pendingDelete;
    const before = clients;
    // Remove locally first — a delete that leaves the row sitting there for a
    // second reads as "it didn't work" and invites a second tap.
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
      onRefresh={refresh}
      hero={
        <Stack gap={12} style={{ marginBottom: 18 }}>
          <SearchField value={query} onChange={setQuery} placeholder="Naam, bedrijf of e-mail" />
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
          icon={<Users size={22} />}
          title={query ? "Niets gevonden" : "Nog geen klanten"}
          body={
            query
              ? `Geen klant komt overeen met “${query}”.`
              : "Klantaccounts verschijnen hier zodra ze zijn aangemaakt."
          }
          action={query ? { label: "Zoekopdracht wissen", onClick: () => setQuery("") } : undefined}
        />
      ) : (
        <Stack gap={9}>
          {visible.map((cl, i) => (
            <motion.div
              key={cl.id}
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
                    onClick: () => setPendingDelete(cl),
                    tone: c.danger,
                  },
                ]}
              >
                <ClientRow client={cl} onClick={() => navigate(`/app/client/${cl.id}`)} />
              </SwipeRow>
            </motion.div>
          ))}
        </Stack>
      )}

      <ConfirmSheet
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title={`${pendingDelete?.name} verwijderen?`}
        body="Het account en alle bijbehorende projecten, berichten en galerijen worden definitief verwijderd. Dit kan niet ongedaan gemaakt worden."
      />
    </Screen>
  );
}

function ClientRow({ client, onClick }: { client: Client; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        border: "none",
        padding: 0,
        background: "none",
        textAlign: "left",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <Card style={{ padding: 14 }}>
        <Row gap={12}>
          <Avatar name={client.name} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Ellipsis style={{ fontSize: 14.5, fontWeight: 650, color: c.fg }}>
              {client.name}
            </Ellipsis>
            <Ellipsis style={{ fontSize: 12, color: c.fg3, marginTop: 2 }}>
              {client.company || client.email}
            </Ellipsis>
            <Row gap={8} style={{ marginTop: 7 }}>
              <Chip tone={client.projectCount ? "copper" : "neutral"}>
                {client.projectCount} {client.projectCount === 1 ? "project" : "projecten"}
              </Chip>
              <span style={{ fontSize: 10.5, color: c.fg4, fontWeight: 500 }}>
                Actief {timeAgo(client.lastSignIn)}
              </span>
            </Row>
          </div>
          <ChevronRight size={17} color={c.fg4} style={{ flexShrink: 0 }} />
        </Row>
      </Card>
    </button>
  );
}
