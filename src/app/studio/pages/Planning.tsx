import type { DatesSetArg, EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import nlLocale from "@fullcalendar/core/locales/nl";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg, type EventResizeDoneArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Copy, Link2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { errorMessage, post, put } from "../api";
import { EventDialog, type EventDraft } from "../components/EventDialog";
import { KIND_LABEL } from "../format";
import { lightFor } from "../light";
import { keys, useCalendarFeed, useEvents } from "../queries";
import type { StudioEvent } from "../types";
import { Button, Modal, PageHead, useConfirm } from "../ui";
import { copyText } from "./Money";

export function PlanningPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [editing, setEditing] = useState<EventDraft | null>(null);
  const [feedOpen, setFeedOpen] = useState(false);
  const events = useEvents(range?.from, range?.to);

  useEffect(() => {
    if (params.get("new") === "1") { setEditing({ kind: "shoot" }); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const calendarEvents: EventInput[] = useMemo(() => (events.data || []).map((e) => ({
    id: e.id,
    title: e.title || [KIND_LABEL[e.kind], e.projectTitle].filter(Boolean).join(": "),
    start: e.allDay ? e.startsAt.slice(0, 10) : e.startsAt,
    end: e.allDay ? undefined : e.endsAt || undefined,
    allDay: e.allDay,
    classNames: [`k-${e.kind}`],
    editable: !e.derived,
    extendedProps: { event: e },
  })), [events.data]);

  // The golden hour of the studio's home area, as a band on the week view.
  const goldenBands: EventInput[] = useMemo(() => {
    if (!range) return [];
    const out: EventInput[] = [];
    for (let d = new Date(range.from); d < new Date(range.to); d = new Date(d.getTime() + 86400000)) {
      const l = lightFor(d, 51.53, 4.47);
      if (!l) continue;
      out.push({ start: l.goldenEvening, end: l.sunset, display: "background", color: "rgba(176,106,44,0.13)", groupId: "golden" });
    }
    return out;
  }, [range]);

  async function persistTimes(ev: StudioEvent, start: Date | null, end: Date | null, allDay: boolean, revert: () => void) {
    try {
      await put(`/admin/events/${ev.id}`, { startsAt: start?.toISOString(), endsAt: allDay ? null : end?.toISOString() ?? null, allDay });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: keys.overview });
      toast.success("Afspraak verzet");
    } catch (err) {
      revert();
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="s-view" style={{ maxWidth: "none" }}>
      <PageHead
        title="Planning"
        sub="Shoots, meetings en deadlines. Sleep een afspraak om hem te verzetten; het koperen vlak is golden hour."
        actions={
          <>
            <Button icon={<Link2 />} onClick={() => setFeedOpen(true)}>Abonneer in agenda</Button>
            <Button variant="primary" icon={<CalendarPlus />} onClick={() => setEditing({ kind: "shoot" })}>Inplannen</Button>
          </>
        }
      />
      <div className="s-legend">
        <span><i style={{ background: "var(--accent)" }} />Shoot</span>
        <span><i style={{ background: "var(--info)" }} />Meeting</span>
        <span><i style={{ background: "var(--faint)" }} />Bewerken</span>
        <span><i style={{ background: "var(--warn)" }} />Deadline</span>
        <span><i style={{ background: "rgba(176,106,44,0.25)" }} />Golden hour (Roosendaal)</span>
      </div>
      <div className="s-card s-cal" style={{ padding: 14 }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={nlLocale}
          initialView={typeof window !== "undefined" && window.innerWidth < 760 ? "listWeek" : "timeGridWeek"}
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listMonth" }}
          buttonText={{ today: "Vandaag", month: "Maand", week: "Week", list: "Lijst" }}
          firstDay={1}
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          scrollTime="08:00:00"
          nowIndicator
          height="auto"
          expandRows
          allDaySlot
          allDayText="Hele dag"
          editable
          eventDurationEditable
          selectable={false}
          dayMaxEvents={4}
          events={[...calendarEvents, ...goldenBands]}
          datesSet={(arg: DatesSetArg) => setRange({ from: arg.start.toISOString(), to: arg.end.toISOString() })}
          dateClick={(arg: DateClickArg) => {
            const start = arg.allDay ? new Date(`${arg.dateStr}T10:00`) : arg.date;
            setEditing({ kind: "shoot", startsAt: start.toISOString() });
          }}
          eventClick={(arg: EventClickArg) => {
            const ev = arg.event.extendedProps.event as StudioEvent | undefined;
            if (!ev) return;
            if (ev.derived) { if (ev.projectId) navigate(`/admin/project/${ev.projectId}`); return; }
            setEditing(ev);
          }}
          eventDrop={(arg: EventDropArg) => {
            const ev = arg.event.extendedProps.event as StudioEvent;
            persistTimes(ev, arg.event.start, arg.event.end, arg.event.allDay, arg.revert);
          }}
          eventResize={(arg: EventResizeDoneArg) => {
            const ev = arg.event.extendedProps.event as StudioEvent;
            persistTimes(ev, arg.event.start, arg.event.end, arg.event.allDay, arg.revert);
          }}
        />
      </div>
      <EventDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} initial={editing} />
      <FeedDialog open={feedOpen} onClose={() => setFeedOpen(false)} />
    </div>
  );
}

function FeedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const feed = useCalendarFeed(open);
  const [rotating, setRotating] = useState(false);
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Abonneren in je agenda"
      description="Voeg deze link toe in Google Agenda (Andere agenda's, Via URL) of Apple Agenda (Nieuw agenda-abonnement). Je shoots en meetings verschijnen daar vanzelf."
      footer={<Button onClick={onClose}>Klaar</Button>}>
      <div className="s-row nowrap">
        <input className="s-input s-mono" readOnly value={feed.data || "Laden…"} onFocus={(e) => e.currentTarget.select()} aria-label="Agendalink" style={{ fontSize: 12 }} />
        <Button icon={<Copy />} disabled={!feed.data} onClick={() => feed.data && copyText(feed.data)}>Kopieer</Button>
      </div>
      <p className="s-small s-muted">Deze link is privé: wie hem heeft, ziet je planning. Gelekt? Maak een nieuwe; de oude werkt dan niet meer.</p>
      <Button size="sm" variant="ghost" icon={<RefreshCw />} loading={rotating} style={{ alignSelf: "flex-start" }}
        onClick={async () => {
          if (!(await confirm({ title: "Nieuwe link maken?", body: "Agenda's met de oude link stoppen met bijwerken.", confirm: "Nieuwe link" }))) return;
          setRotating(true);
          try {
            const r = await post<{ url: string }>("/admin/calendar-feed");
            qc.setQueryData(keys.feed, r.url);
            toast.success("Nieuwe link gemaakt");
          } catch (err) { toast.error(errorMessage(err)); } finally { setRotating(false); }
        }}>
        Nieuwe link maken
      </Button>
    </Modal>
  );
}
