import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("8787"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-5"),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  TWILIO_ACCOUNT_SID: z.string().min(1, "TWILIO_ACCOUNT_SID is required"),
  TWILIO_AUTH_TOKEN: z.string().min(1, "TWILIO_AUTH_TOKEN is required"),
  TWILIO_WHATSAPP_FROM: z
    .string()
    .min(1, "TWILIO_WHATSAPP_FROM is required, e.g. whatsapp:+14155238886"),
  // Set to "true" only for local dev without a public HTTPS URL in front of the
  // webhook (skips Twilio request-signature verification). Never set in prod.
  SKIP_TWILIO_SIGNATURE_CHECK: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  PUBLIC_WEBHOOK_URL: z
    .string()
    .url()
    .optional()
    .describe("Full public URL of /webhooks/whatsapp, used for Twilio signature verification"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error("\nCopy apps/agent/.env.example to apps/agent/.env and fill in the values.");
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
