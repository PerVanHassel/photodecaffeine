/**
 * Typed data layer for the admin app.
 *
 * Wraps the same edge-function endpoints the desktop admin panel calls, so the
 * two stay in lockstep — this is a new front end over the existing backend, not
 * a second backend. The types mirror what the server actually returns (see
 * supabase/functions/server/index.tsx) rather than what would be convenient.
 */
import { portalFetch } from "../../lib/supabase";
import { projectId } from "/utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-0951c59e`;

export const BUCKETS = {
  images: "portfolio-images-0951c59e",
  declarations: "declaration-files-0951c59e",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  email: string;
  name: string;
  company: string;
  projectCount: number;
  createdAt: string;
  lastSignIn: string | null;
}

export interface Deliverable {
  id: string;
  name: string;
  count: number;
  done: boolean;
}

export type ProjectStatus = "in_progress" | "in_review" | "delivered" | "on_hold";

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  phase: string;
  description: string;
  dueDate: string;
  clientId: string;
  createdAt: string;
  deliverables: Deliverable[];
  meeting?: { date?: string; time?: string; location?: string; notes?: string };
  galleryUrls?: string[];
  gallerySettings?: {
    title?: string;
    subtitle?: string;
    coverUrl?: string;
    accentColor?: string;
  };
}

export interface Message {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: "pdc" | "client";
  content: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  brand: string;
  message: string;
  package: string;
  createdAt: string;
}

export type ReminderType = string;

export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  type: ReminderType;
  relatedId?: string;
  /**
   * The server's field name is `completed`, not `done` — the reminders PUT
   * endpoint shallow-merges whatever it is sent, so a `done` flag would be
   * stored happily and then read by nothing.
   */
  completed?: boolean;
  createdBy?: string;
  createdAt?: string;
}

export interface Declaration {
  id: string;
  adminId: string;
  adminName: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
  date: string;
  category: string;
  description: string;
  receiptUrl: string;
  submittedBy: { id: string; name: string };
  createdAt: string;
}

export interface DeclarationTotals {
  amount: number;
  vatAmount: number;
  count: number;
  byCategory: Record<string, number>;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  coverType: "image" | "video";
  description: string;
  galleryUrls: string[];
  published: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id?: string; name?: string };
  updatedBy?: { id?: string; name?: string };
}

export interface Worker {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignIn: string | null;
  isOwner: boolean;
  roleId: string | null;
  roleName: string;
  permissions: Record<string, boolean> | null;
}

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
}

export interface Review {
  id: string;
  projectId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  rating: number;
  text: string;
  portfolioArticleId: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackItem {
  id: string;
  scope: "photos" | "general";
  photoUrls: string[];
  category: string;
  text: string;
}

export interface FeedbackEntry {
  id: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  items: FeedbackItem[];
  createdAt: string;
}

export interface SiteSettings {
  heroImageUrl: string;
  heroImageMobileUrl: string;
  frameImageUrl: string;
  sections: {
    workProcess: boolean;
    portfolio: boolean;
    about: boolean;
    services: boolean;
    socialProof: boolean;
    customCTA: boolean;
  };
  studioName: string;
  contactEmail: string;
}

// ── Client ────────────────────────────────────────────────────────────────

/**
 * All calls go through one object bound to an access token, so no screen has to
 * remember to pass it (and none can accidentally fire an unauthenticated
 * request that comes back 401 as an empty list).
 */
export function createApi(token: string) {
  const get = <T>(path: string) => portalFetch(path, {}, token) as Promise<T>;
  const send = <T>(path: string, method: string, body?: unknown) =>
    portalFetch(
      path,
      { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) },
      token
    ) as Promise<T>;

  return {
    // Clients & projects
    clients: () => get<{ clients: Client[] }>("/admin/clients").then((r) => r.clients ?? []),
    client: (id: string) => get<{ client: Client; projects: Project[] }>(`/admin/client/${id}`),
    deleteClient: (id: string) => send<unknown>(`/admin/client/${id}`, "DELETE"),

    project: (id: string) => get<{ project: Project }>(`/admin/project/${id}`).then((r) => r.project),
    createProject: (body: Partial<Project> & { clientId: string; title: string }) =>
      send<{ project: Project }>("/admin/project", "POST", body).then((r) => r.project),
    updateProject: (id: string, body: Partial<Project>) =>
      send<{ project: Project }>(`/admin/project/${id}`, "PUT", body).then((r) => r.project),
    deleteProject: (id: string) => send<unknown>(`/admin/project/${id}`, "DELETE"),

    messages: (projectId: string) =>
      get<{ messages: Message[] }>(`/admin/project/${projectId}/messages`).then(
        (r) => r.messages ?? []
      ),
    sendMessage: (projectId: string, content: string) =>
      send<{ message: Message }>(`/admin/project/${projectId}/messages`, "POST", { content }).then(
        (r) => r.message
      ),

    // Inquiries
    inquiries: () =>
      get<{ inquiries: Inquiry[] }>("/admin/inquiries").then((r) => r.inquiries ?? []),
    deleteInquiry: (id: string) => send<unknown>(`/admin/inquiry/${id}`, "DELETE"),

    // Reminders
    reminders: () =>
      get<{ reminders: Reminder[] }>("/admin/reminders").then((r) => r.reminders ?? []),
    createReminder: (body: {
      title: string;
      description?: string;
      dueDate: string;
      type?: string;
      relatedId?: string;
    }) => send<{ reminder: Reminder }>("/admin/reminders", "POST", body).then((r) => r.reminder),
    updateReminder: (id: string, body: Partial<Reminder>) =>
      send<{ reminder: Reminder }>(`/admin/reminders/${id}`, "PUT", body).then((r) => r.reminder),
    deleteReminder: (id: string) => send<unknown>(`/admin/reminders/${id}`, "DELETE"),

    // Declarations
    declarations: (params?: { quarter?: string; category?: string; adminId?: string }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {}).filter(([, v]) => !!v) as [string, string][]
      ).toString();
      return get<{ declarations: Declaration[]; canViewAll: boolean; totals: DeclarationTotals }>(
        `/admin/declarations${qs ? `?${qs}` : ""}`
      );
    },
    createDeclaration: (body: {
      amount: number;
      date: string;
      category: string;
      description: string;
      receiptUrl?: string;
      vatRate?: number;
    }) => send<{ declaration: Declaration }>("/admin/declarations", "POST", body),
    updateDeclaration: (id: string, body: Partial<Declaration>) =>
      send<{ declaration: Declaration }>(`/admin/declarations/${id}`, "PUT", body),
    deleteDeclaration: (id: string) => send<unknown>(`/admin/declarations/${id}`, "DELETE"),

    // Portfolio
    articles: () => get<{ articles: Article[] }>("/admin/portfolio").then((r) => r.articles ?? []),
    article: (id: string) => get<{ article: Article }>(`/admin/portfolio/${id}`).then((r) => r.article),
    createArticle: (body: Partial<Article>) =>
      send<{ article: Article }>("/admin/portfolio", "POST", body).then((r) => r.article),
    updateArticle: (id: string, body: Partial<Article>) =>
      send<{ article: Article }>(`/admin/portfolio/${id}`, "PUT", body).then((r) => r.article),
    deleteArticle: (id: string) => send<unknown>(`/admin/portfolio/${id}`, "DELETE"),

    // Reviews & feedback
    reviews: () => get<{ reviews: Review[] }>("/admin/reviews").then((r) => r.reviews ?? []),
    updateReview: (id: string, body: { published?: boolean; portfolioArticleId?: string | null }) =>
      send<{ review: Review }>(`/admin/reviews/${id}`, "PUT", body).then((r) => r.review),
    deleteReview: (id: string) => send<unknown>(`/admin/reviews/${id}`, "DELETE"),
    feedback: () =>
      get<{ feedback: FeedbackEntry[] }>("/admin/feedback").then((r) => r.feedback ?? []),

    // Team
    workers: () => get<{ workers: Worker[] }>("/admin/workers").then((r) => r.workers ?? []),
    createWorker: (body: { email: string; password: string; name: string; roleId?: string }) =>
      send<{ worker: Worker }>("/admin/workers", "POST", body),
    setWorkerRole: (id: string, roleId: string | null) =>
      send<unknown>(`/admin/workers/${id}/role`, "PUT", { roleId }),
    deleteWorker: (id: string) => send<unknown>(`/admin/workers/${id}`, "DELETE"),

    roles: () => get<{ roles: Role[] }>("/admin/roles").then((r) => r.roles ?? []),
    createRole: (body: { name: string; permissions: Record<string, boolean> }) =>
      send<{ role: Role }>("/admin/roles", "POST", body).then((r) => r.role),
    updateRole: (id: string, body: { name?: string; permissions?: Record<string, boolean> }) =>
      send<{ role: Role }>(`/admin/roles/${id}`, "PUT", body).then((r) => r.role),
    deleteRole: (id: string) => send<unknown>(`/admin/roles/${id}`, "DELETE"),

    // Settings
    settings: () => get<{ settings: SiteSettings }>("/settings").then((r) => r.settings),
    saveSettings: (body: Partial<SiteSettings>) =>
      send<{ settings: SiteSettings }>("/admin/settings", "PUT", body).then((r) => r.settings),

    // Storage
    /**
     * Uploads through the edge function rather than straight to Storage: the
     * bucket is private to the service role, and this route is what mints the
     * public URL. `fetch` is used directly because portalFetch always sets a
     * JSON content-type, which would break the multipart boundary.
     */
    async upload(file: File, bucket: string = BUCKETS.images): Promise<string> {
      const form = new FormData();
      form.append("file", file);
      form.append("bucketName", bucket);

      const res = await fetch(`${API_BASE}/admin/storage/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload mislukt");
      return data.url as string;
    },

    ensureBucket: (bucketName: string) =>
      send<unknown>("/admin/storage/ensure-bucket", "POST", { bucketName }),
  };
}

export type Api = ReturnType<typeof createApi>;
