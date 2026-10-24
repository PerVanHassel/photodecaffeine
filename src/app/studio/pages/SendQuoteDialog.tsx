import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { post } from "../api";
import { keys, useAction } from "../queries";
import type { Quote } from "../types";
import { Button, Modal, TextAreaField, TextField } from "../ui";

export function SendQuoteDialog({ quote, onClose }: { quote: Quote | null; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { if (quote) { setEmail(quote.clientEmail); setMessage(""); } }, [quote]);
  const send = useAction({
    fn: () => post(`/admin/quotes/${quote!.id}/send`, { email, message }),
    invalidate: () => [keys.quotes, keys.overview],
    success: () => `Offerte verstuurd naar ${email}`,
    onSuccess: onClose,
  });
  return (
    <Modal
      open={!!quote}
      onOpenChange={(o) => !o && onClose()}
      title={quote?.sentAt ? "Opnieuw versturen" : "Offerte versturen"}
      description={quote ? `${quote.number} · ${quote.title}` : undefined}
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" icon={<Send />} loading={send.isPending} onClick={() => send.mutate()} disabled={!email.includes("@")}>Versturen</Button></>}
    >
      <TextField label="Naar" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextAreaField label="Persoonlijk bericht (optioneel)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} hint="Komt bovenaan de mail, na de begroeting." />
      {quote?.details?.replaces?.number && (
        <p className="s-small s-muted">Na het versturen kan {quote.details.replaces.number} niet meer geaccepteerd worden.</p>
      )}
    </Modal>
  );
}
