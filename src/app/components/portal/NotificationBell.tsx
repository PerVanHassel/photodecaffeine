import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, MessageSquare, UserPlus, Mail, Star, ListChecks, FileText, X, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";

type NotificationType = "message" | "client" | "inquiry" | "review" | "feedback" | "quote";

interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  createdAt: string;
}

const fg = (a: number) => `rgba(var(--admin-fg-rgb),calc(${a} * var(--admin-fg-boost)))`;

const ICONS: Record<NotificationType, typeof Bell> = {
  message: MessageSquare,
  client: UserPlus,
  inquiry: Mail,
  review: Star,
  feedback: ListChecks,
  quote: FileText,
};

/** How long ago, in the words you would actually say. */
function ago(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "net";
  if (mins < 60) return `${mins} min geleden`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.round(hours / 24);
  if (days === 1) return "gisteren";
  if (days < 7) return `${days} dagen geleden`;
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

/**
 * The bell in the admin top bar.
 *
 * It shows what came in — a client's message, a new account, an enquiry, a
 * review, feedback, an answer on a quote — and takes you to the page it
 * happened on. Opening it marks everything seen, but the items that were
 * unread keep their dot for that session so nothing disappears mid-read.
 */
export function NotificationBell() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /** Returns what it loaded, so the caller can act on it without waiting a render. */
  const load = useCallback(async (): Promise<{ notifications: AdminNotification[]; unread: number }> => {
    if (!session) return { notifications: [], unread: 0 };
    try {
      const data = await portalFetch("/admin/notifications", {}, session.access_token);
      const notifications: AdminNotification[] = data.notifications || [];
      const count: number = data.unread || 0;
      setItems(notifications);
      setUnread(count);
      return { notifications, unread: count };
    } catch {
      // A failing bell must not shout over the page you are working on.
      return { notifications: [], unread: 0 };
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [session, load]);

  // Close on a click elsewhere or on Escape, the way a menu should.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || !session) return;

    setLoading(true);
    const fresh = await load();
    setLoading(false);
    // Remember which ones were new BEFORE marking them read, so they stay
    // marked while the panel is open.
    setSeenIds(fresh.notifications.slice(0, fresh.unread).map((n) => n.id));
    if (fresh.unread > 0) {
      try {
        await portalFetch("/admin/notifications/read", { method: "POST" }, session.access_token);
        setUnread(0);
      } catch {
        // Leave the badge up rather than pretend it was read.
      }
    }
  }

  async function clearAll() {
    if (!session) return;
    try {
      await portalFetch("/admin/notifications", { method: "DELETE" }, session.access_token);
      setItems([]);
      setUnread(0);
      setSeenIds([]);
    } catch {
      // Nothing to do — the list stays as it was.
    }
  }

  async function dismiss(id: string) {
    if (!session) return;
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await portalFetch(`/admin/notifications/${id}`, { method: "DELETE" }, session.access_token);
    } catch {
      load();
    }
  }

  function openItem(n: AdminNotification) {
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  const SIZE = 32;

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "flex" }}>
      <button
        onClick={toggle}
        title="Meldingen"
        aria-label={unread > 0 ? `Meldingen, ${unread} nieuw` : "Meldingen"}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          position: "relative",
          background: "none",
          border: `1px solid ${open ? "rgba(200,144,90,0.45)" : fg(0.1)}`,
          color: open ? "#c8905a" : fg(0.5),
          width: `${SIZE}px`,
          height: `${SIZE}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => { if (!open) { e.currentTarget.style.borderColor = fg(0.3); e.currentTarget.style.color = "var(--admin-fg-solid)"; } }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.borderColor = fg(0.1); e.currentTarget.style.color = fg(0.5); } }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              minWidth: "16px",
              height: "16px",
              padding: "0 4px",
              boxSizing: "border-box",
              backgroundColor: "#c8905a",
              color: "#0d0703",
              fontSize: "9px",
              fontWeight: 800,
              lineHeight: "16px",
              textAlign: "center",
              borderRadius: "8px",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Meldingen"
          style={{
            position: "absolute",
            top: `${SIZE + 8}px`,
            right: 0,
            width: "min(340px, calc(100vw - 32px))",
            maxHeight: "min(460px, calc(100vh - 120px))",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "rgb(var(--admin-bg-card-rgb))",
            border: `1px solid ${fg(0.16)}`,
            boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            zIndex: 120,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${fg(0.08)}` }}>
            <span style={{ color: fg(0.35), fontSize: "9px", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase" }}>
              Meldingen
            </span>
            {items.length > 0 && (
              <button
                onClick={clearAll}
                style={{ background: "none", border: "none", color: fg(0.35), fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Space Grotesk', system-ui, sans-serif", padding: 0 }}
              >
                Alles wissen
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && items.length === 0 ? (
              <p style={{ color: fg(0.3), fontSize: "12px", padding: "22px 14px", margin: 0 }}>Laden…</p>
            ) : items.length === 0 ? (
              <div style={{ padding: "26px 16px", textAlign: "center" }}>
                <Check size={16} color={fg(0.25)} />
                <p style={{ color: fg(0.35), fontSize: "12.5px", lineHeight: 1.7, margin: "10px 0 0" }}>
                  Niets nieuws. Berichten van klanten, nieuwe aanvragen en reacties op prijsopgaves komen hier binnen.
                </p>
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                const isNew = seenIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      gap: "10px",
                      padding: "12px 12px 12px 14px",
                      borderBottom: `1px solid ${fg(0.05)}`,
                      backgroundColor: isNew ? "rgba(200,144,90,0.06)" : "transparent",
                    }}
                  >
                    <span style={{ color: "#c8905a", flexShrink: 0, paddingTop: "2px" }}>
                      <Icon size={14} />
                    </span>
                    <button
                      role="menuitem"
                      onClick={() => openItem(n)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        background: "none",
                        border: "none",
                        padding: 0,
                        textAlign: "left",
                        cursor: n.link ? "pointer" : "default",
                        fontFamily: "'Space Grotesk', system-ui, sans-serif",
                      }}
                    >
                      <span style={{ display: "block", color: "var(--admin-fg-solid)", fontSize: "13px", fontWeight: 600, lineHeight: 1.45 }}>
                        {n.title}
                      </span>
                      {n.body && (
                        <span style={{ display: "block", color: fg(0.4), fontSize: "12px", lineHeight: 1.55, marginTop: "3px" }}>
                          {n.body.length > 110 ? `${n.body.slice(0, 110)}…` : n.body}
                        </span>
                      )}
                      <span style={{ display: "block", color: fg(0.25), fontSize: "10.5px", marginTop: "5px" }}>
                        {ago(n.createdAt)}
                      </span>
                    </button>
                    <button
                      onClick={() => dismiss(n.id)}
                      title="Melding weghalen"
                      aria-label={`${n.title} weghalen`}
                      style={{ background: "none", border: "none", color: fg(0.25), cursor: "pointer", padding: "2px", alignSelf: "flex-start", display: "flex" }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
