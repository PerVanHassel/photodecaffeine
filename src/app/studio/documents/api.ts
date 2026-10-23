import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { del, errorMessage, get, post, put } from "../api";
import type { DocNote, DocState } from "./types";

const key = (doc: string) => ["document", doc] as const;

export const useDocState = (doc: string) =>
  useQuery({ queryKey: key(doc), queryFn: ({ signal }) => get<DocState>(`/admin/documents/${doc}`, signal) });

/** Add, change and remove notes; the list updates as soon as the server agrees. */
export function useNoteActions(doc: string) {
  const qc = useQueryClient();
  const patch = (fn: (notes: DocNote[]) => DocNote[]) =>
    qc.setQueryData<DocState>(key(doc), (s) => (s ? { ...s, notes: fn(s.notes) } : s));
  const onError = (err: unknown) => toast.error(errorMessage(err));

  const add = useMutation({
    mutationFn: (b: { sectionId: string; text: string }) => post<{ note: DocNote }>(`/admin/documents/${doc}/notes`, b),
    onSuccess: ({ note }) => patch((notes) => [...notes, note]),
    onError,
  });
  const edit = useMutation({
    mutationFn: (b: { id: string; text: string }) => put<{ note: DocNote }>(`/admin/documents/${doc}/notes/${b.id}`, { text: b.text }),
    onSuccess: ({ note }) => patch((notes) => notes.map((n) => (n.id === note.id ? note : n))),
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => del(`/admin/documents/${doc}/notes/${id}`).then(() => id),
    onSuccess: (id) => patch((notes) => notes.filter((n) => n.id !== id)),
    onError,
  });
  return { add, edit, remove };
}

/**
 * Remembers what you have read and where you are. The screen updates at once;
 * the server hears about it a moment later, so paging quickly sends one save.
 */
export function useReadProgress(doc: string) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (update: (read: DocState["read"]) => DocState["read"]) => {
    const state = qc.getQueryData<DocState>(key(doc));
    if (!state) return;
    const read = update(state.read);
    qc.setQueryData<DocState>(key(doc), { ...state, read });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      put(`/admin/documents/${doc}/read`, read).catch(() => {
        // Losing a bookmark is not worth interrupting the reader for.
      });
    }, 700);
  };
}
