import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { post } from "../../api";
import { useLiveMessages } from "../../live";
import { fmtDateTime } from "../../format";
import { keys, useAction, useMessages } from "../../queries";
import type { Message, Project } from "../../types";
import { Button, Card, Empty, ErrorState, SkeletonList, Textarea } from "../../ui";

export function MessagesTab({ project: p }: { project: Project }) {
  const qc = useQueryClient();
  const messages = useMessages(p.id);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useLiveMessages(p.id, keys.messages(p.id));

  const list = messages.data || [];
  const unread = list.some((m) => m.senderRole === "client" && !m.readAt);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [list.length]);

  useEffect(() => {
    if (!unread) return;
    post(`/admin/project/${p.id}/messages/read`).then(() => {
      qc.invalidateQueries({ queryKey: keys.project(p.id) });
      qc.invalidateQueries({ queryKey: keys.overview });
    }).catch(() => { /* marking read is best effort */ });
  }, [unread, p.id, qc]);

  const send = useAction({
    fn: (content: string) => post<{ message: Message }>(`/admin/project/${p.id}/messages`, { content }),
    invalidate: () => [keys.messages(p.id), keys.overview],
    success: "Verstuurd, de klant krijgt een mail",
    onSuccess: () => setText(""),
  });

  const recipients = (p.clients || []).filter((c) => c.email).map((c) => c.name);

  return (
    <Card bodyClass="none">
      <div className="s-card-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {messages.isLoading ? <SkeletonList rows={3} /> : messages.isError ? <ErrorState error={messages.error} /> : list.length === 0 ? (
          <Empty title="Nog geen berichten">Schrijf de klant hieronder. Ze krijgen een mail en kunnen antwoorden in het portaal.</Empty>
        ) : (
          <div className="s-msgs">
            {list.map((m) => (
              <div key={m.id} className={`s-msg ${m.senderRole === "pdc" ? "me" : ""}`}>
                <b>{m.senderRole === "pdc" ? m.senderName || "PDC" : m.senderName}</b>
                {m.content}
                <small>{fmtDateTime(m.createdAt)}{m.senderRole === "pdc" && m.readAt ? " · gelezen" : ""}</small>
              </div>
            ))}
            <div ref={end} />
          </div>
        )}
      </div>
      <form
        className="s-composer"
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()); }}
      >
        <Textarea
          aria-label="Bericht"
          placeholder={recipients.length ? `Bericht aan ${recipients.join(", ")}… (Ctrl+Enter verstuurt)` : "Er staat nog geen klant met e-mailadres bij dit project"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && text.trim()) send.mutate(text.trim()); }}
          rows={2}
        />
        <Button type="submit" variant="primary" icon={<Send />} loading={send.isPending} disabled={!text.trim()}>Stuur</Button>
      </form>
    </Card>
  );
}
