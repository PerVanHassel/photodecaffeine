import twilio from "twilio";
import { env } from "../config.js";

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export interface InboundWhatsAppMessage {
  fromE164: string; // normalized, without the "whatsapp:" prefix
  body: string;
}

/**
 * Parses a Twilio WhatsApp webhook POST body (application/x-www-form-urlencoded,
 * already parsed by express.urlencoded()) into the channel-agnostic shape the
 * orchestrator expects. This is the one place that knows about Twilio's
 * "whatsapp:+31..." format -- swapping to the Meta Cloud API later only means
 * writing a new parser here and in the webhook route, per the adapter-layer
 * design in the architecture doc (§3.1).
 */
export function parseTwilioWebhookBody(body: Record<string, string>): InboundWhatsAppMessage {
  const from = body.From ?? ""; // e.g. "whatsapp:+31612345678"
  return {
    fromE164: from.replace(/^whatsapp:/, ""),
    body: (body.Body ?? "").trim(),
  };
}

export function verifyTwilioSignature(
  signature: string | undefined,
  publicUrl: string,
  params: Record<string, string>
): boolean {
  if (env.SKIP_TWILIO_SIGNATURE_CHECK) return true;
  if (!signature) return false;
  return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, publicUrl, params);
}

export async function sendWhatsAppMessage(toE164: string, body: string): Promise<void> {
  await client.messages.create({
    from: env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${toE164}`,
    body,
  });
}
