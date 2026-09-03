import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useApi } from "./useApi";
import { useHandled } from "./useHandled";
import type { Client, Inquiry, Reminder } from "./api";

/**
 * Shared store for the three collections that drive more than one screen:
 * clients (Home + Klanten), inquiries (Home + Inbox + tab badge) and reminders
 * (Home + Taken + tab badge).
 *
 * Held once above the tabs rather than fetched per screen so the badges stay
 * truthful — a badge that only updates when you happen to open its tab is worse
 * than no badge at all. Everything else stays screen-local via useQuery.
 */

interface AppDataValue {
  clients: Client[];
  inquiries: Inquiry[];
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Inquiries not yet marked handled on this device. */
  openInquiryCount: number;
  /** Reminders due today or overdue and not ticked off. */
  dueReminderCount: number;
  setReminders: (updater: (prev: Reminder[]) => Reminder[]) => void;
  setInquiries: (updater: (prev: Inquiry[]) => Inquiry[]) => void;
  setClients: (updater: (prev: Client[]) => Client[]) => void;
}

const Ctx = createContext<AppDataValue | null>(null);

/** End of today, so "due" includes anything scheduled for later today. */
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { handled } = useHandled();

  const [clients, setClientsState] = useState<Client[]>([]);
  const [inquiries, setInquiriesState] = useState<Inquiry[]>([]);
  const [reminders, setRemindersState] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    // allSettled, not all: one failing endpoint (a permission this admin does
    // not have, say) must not blank the other two lists.
    const [c, i, r] = await Promise.allSettled([api.clients(), api.inquiries(), api.reminders()]);
    if (!mounted.current) return;

    if (c.status === "fulfilled") setClientsState(c.value);
    if (i.status === "fulfilled") setInquiriesState(i.value);
    if (r.status === "fulfilled") setRemindersState(r.value);

    if (c.status === "rejected" && i.status === "rejected" && r.status === "rejected") {
      setError(c.reason instanceof Error ? c.reason.message : "Kon gegevens niet laden");
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-read when the app returns to the foreground: on a phone the gap between
  // "opened the app" and "last loaded" is usually hours, not seconds.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const openInquiryCount = useMemo(
    () => inquiries.filter((q) => !handled.has(q.id)).length,
    [inquiries, handled]
  );

  const dueReminderCount = useMemo(() => {
    const cutoff = endOfToday();
    return reminders.filter((r) => !r.completed && new Date(r.dueDate).getTime() <= cutoff).length;
  }, [reminders]);

  const value = useMemo<AppDataValue>(
    () => ({
      clients,
      inquiries,
      reminders,
      loading,
      error,
      refresh,
      openInquiryCount,
      dueReminderCount,
      setReminders: (u) => setRemindersState((prev) => u(prev)),
      setInquiries: (u) => setInquiriesState((prev) => u(prev)),
      setClients: (u) => setClientsState((prev) => u(prev)),
    }),
    [clients, inquiries, reminders, loading, error, refresh, openInquiryCount, dueReminderCount]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppData moet binnen AppDataProvider gebruikt worden");
  return ctx;
}
