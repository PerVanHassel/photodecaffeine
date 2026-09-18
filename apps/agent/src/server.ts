import express from "express";
import { env } from "./config.js";
import { findOrCreateUser } from "./db/supabase.js";
import { handleIncomingMessage } from "./claude/orchestrator.js";
import { parseTwilioWebhookBody, sendWhatsAppMessage, verifyTwilioSignature } from "./whatsapp/twilio.js";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.post("/webhooks/whatsapp", async (req, res) => {
  // Twilio requires a fast response; ack immediately and do the real work
  // after responding so a slow Claude call never causes a webhook retry.
  res.status(200).send("<Response></Response>");

  const publicUrl = env.PUBLIC_WEBHOOK_URL ?? `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const signature = req.header("X-Twilio-Signature");
  const isValid = verifyTwilioSignature(signature, publicUrl, req.body);
  if (!isValid) {
    console.error("Rejected webhook request: invalid Twilio signature");
    return;
  }

  try {
    const inbound = parseTwilioWebhookBody(req.body);
    if (!inbound.fromE164 || !inbound.body) {
      console.error("Skipping webhook: missing From/Body", req.body);
      return;
    }

    const user = await findOrCreateUser(inbound.fromE164);
    const replyText = await handleIncomingMessage(user, inbound.body);
    await sendWhatsAppMessage(inbound.fromE164, replyText);
  } catch (err) {
    console.error("Failed to process inbound WhatsApp message:", err);
  }
});

app.listen(Number(env.PORT), () => {
  console.log(`AI Life OS agent spike listening on :${env.PORT}`);
});
