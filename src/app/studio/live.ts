import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { keys } from "./queries";

/**
 * Keeps "Wacht op jou" and the badge on Vandaag current without a reload: a
 * client's message, a new enquiry or an answered quote shows up the moment it
 * is written. A phone that wakes the tab up gets a fresh copy as well, since
 * nothing comes through while it sleeps.
 */
export function useLiveOverview() {
  const qc = useQueryClient();
  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: keys.overview });
    const channel = supabase
      .channel("studio:overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (change) => {
        refresh();
        const projectId = ((change.new || change.old) as { project_id?: string }).project_id;
        if (projectId) qc.invalidateQueries({ queryKey: keys.project(projectId) });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inquiries" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotes" }, refresh)
      .subscribe();
    // Safari restores a tab it kept in memory without a focus event.
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) qc.invalidateQueries(); };
    window.addEventListener("pageshow", onShow);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("pageshow", onShow);
    };
  }, [qc]);
}

/**
 * Refreshes a project's messages the moment one is written, from either side.
 * Row-level security decides who receives the change: admins see every
 * project, clients only their own.
 */
export function useLiveMessages(projectId: string, queryKey: readonly unknown[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${projectId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
}
