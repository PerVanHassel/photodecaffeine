import { keepPreviousData, QueryClient, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { del, errorMessage, get, post, put, upload } from "./api";
import type {
  Business, Client, Inquiry, Invoice, Message, Overview, Project, Quote, SearchResults, Shot, StudioEvent, StudioLocation, Task,
} from "./types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err: any) => count < 2 && !(err?.status >= 400 && err?.status < 500),
      refetchOnWindowFocus: true,
    },
  },
});

export const keys = {
  overview: ["overview"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["project", id] as const,
  messages: (id: string) => ["messages", id] as const,
  shots: (id: string) => ["shots", id] as const,
  clients: ["clients"] as const,
  client: (id: string) => ["client", id] as const,
  inquiries: ["inquiries"] as const,
  locations: ["locations"] as const,
  events: (from?: string, to?: string, projectId?: string) => ["events", from ?? "", to ?? "", projectId ?? ""] as const,
  tasks: ["tasks"] as const,
  quotes: ["quotes"] as const,
  invoices: ["invoices"] as const,
  invoice: (id: string) => ["invoice", id] as const,
  search: (q: string) => ["search", q] as const,
  feed: ["calendar-feed"] as const,
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const useOverview = () =>
  useQuery({ queryKey: keys.overview, queryFn: ({ signal }) => get<Overview>("/admin/overview", signal), refetchInterval: 60_000 });

export const useProjects = () =>
  useQuery({ queryKey: keys.projects, queryFn: ({ signal }) => get<{ projects: Project[] }>("/admin/projects", signal).then((r) => r.projects) });

export const useProject = (id: string) =>
  useQuery({ queryKey: keys.project(id), queryFn: ({ signal }) => get<{ project: Project }>(`/admin/project/${id}`, signal).then((r) => r.project), enabled: !!id });

export const useMessages = (projectId: string) =>
  useQuery({
    queryKey: keys.messages(projectId),
    queryFn: ({ signal }) => get<{ messages: Message[] }>(`/admin/project/${projectId}/messages`, signal).then((r) => r.messages),
    refetchInterval: 20_000,
    enabled: !!projectId,
  });

export const useShots = (projectId: string) =>
  useQuery({ queryKey: keys.shots(projectId), queryFn: ({ signal }) => get<{ shots: Shot[] }>(`/admin/project/${projectId}/shots`, signal).then((r) => r.shots) });

export const useClients = () =>
  useQuery({ queryKey: keys.clients, queryFn: ({ signal }) => get<{ clients: Client[] }>("/admin/clients", signal).then((r) => r.clients) });

export type ClientDetail = {
  client: Client;
  projects: Project[];
  quotes: { id: string; number: string; title: string; status: string; sent_at: string | null; created_at: string }[];
  invoices: { id: string; number: string; status: string; due_on: string; created_at: string }[];
  inquiries: { id: string; message: string; created_at: string }[];
};
export const useClient = (id: string) =>
  useQuery({ queryKey: keys.client(id), queryFn: ({ signal }) => get<ClientDetail>(`/admin/client/${id}`, signal), enabled: !!id });

export const useInquiries = () =>
  useQuery({ queryKey: keys.inquiries, queryFn: ({ signal }) => get<{ inquiries: Inquiry[] }>("/admin/inquiries?visits=0", signal).then((r) => r.inquiries) });

export const useLocations = () =>
  useQuery({ queryKey: keys.locations, queryFn: ({ signal }) => get<{ locations: StudioLocation[] }>("/admin/locations", signal).then((r) => r.locations) });

export const useEvents = (from?: string, to?: string, projectId?: string) =>
  useQuery({
    queryKey: keys.events(from, to, projectId),
    queryFn: ({ signal }) => {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (projectId) qs.set("projectId", projectId);
      return get<{ events: StudioEvent[] }>(`/admin/events?${qs}`, signal).then((r) => r.events);
    },
    placeholderData: keepPreviousData,
  });

export const useTasks = () =>
  useQuery({ queryKey: keys.tasks, queryFn: ({ signal }) => get<{ tasks: Task[] }>("/admin/tasks", signal).then((r) => r.tasks) });

export const useQuotes = () =>
  useQuery({ queryKey: keys.quotes, queryFn: ({ signal }) => get<{ quotes: Quote[] }>("/admin/quotes", signal).then((r) => r.quotes) });

export const useInvoices = () =>
  useQuery({ queryKey: keys.invoices, queryFn: ({ signal }) => get<{ invoices: Invoice[] }>("/admin/invoices", signal).then((r) => r.invoices) });

export const useInvoice = (id: string) =>
  useQuery({ queryKey: keys.invoice(id), queryFn: ({ signal }) => get<{ invoice: Invoice; business: Business }>(`/admin/invoices/${id}`, signal), enabled: !!id });

export const useSearch = (q: string) =>
  useQuery({
    queryKey: keys.search(q),
    queryFn: ({ signal }) => get<SearchResults>(`/admin/search?q=${encodeURIComponent(q)}`, signal),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

export const useCalendarFeed = (enabled: boolean) =>
  useQuery({ queryKey: keys.feed, queryFn: ({ signal }) => get<{ url: string }>("/admin/calendar-feed", signal).then((r) => r.url), enabled });

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

type MutationOptions<TVars, TData> = {
  fn: (vars: TVars) => Promise<TData>;
  /** Query keys to refresh afterwards. */
  invalidate?: (vars: TVars, data: TData) => QueryKey[];
  success?: string | ((data: TData, vars: TVars) => string | null);
  onSuccess?: (data: TData, vars: TVars) => void;
};

/** A mutation that refreshes what it touched and reports the outcome in a toast. */
export function useAction<TVars = void, TData = unknown>(o: MutationOptions<TVars, TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: o.fn,
    onSuccess: (data, vars) => {
      for (const key of o.invalidate?.(vars, data) || []) qc.invalidateQueries({ queryKey: key });
      const msg = typeof o.success === "function" ? o.success(data, vars) : o.success;
      if (msg) toast.success(msg);
      o.onSuccess?.(data, vars);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export const api = { get, post, put, del, upload };
