/**
 * Offline smoke test for logic that doesn't require live Anthropic/Supabase/
 * Twilio credentials -- run with `pnpm --filter @photodecaffeine/agent test`.
 * This does NOT replace testing the real webhook -> Claude -> DB -> reply
 * loop against live accounts (see README "Testen" section); it only catches
 * regressions in the pure parsing/prompt logic without needing secrets.
 */
process.env.ANTHROPIC_API_KEY ??= "sk-ant-test-dummy";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-dummy-key";
process.env.TWILIO_ACCOUNT_SID ??= "ACtestdummy";
process.env.TWILIO_AUTH_TOKEN ??= "test-dummy-token";
process.env.TWILIO_WHATSAPP_FROM ??= "whatsapp:+14155238886";
process.env.SKIP_TWILIO_SIGNATURE_CHECK = "true";

const { parseTwilioWebhookBody, verifyTwilioSignature } = await import("./whatsapp/twilio.js");
const { buildSystemPrompt } = await import("./claude/prompt.js");

let failures = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  ok  - ${name}`);
  } else {
    console.error(`FAIL  - ${name}`);
    failures++;
  }
}

console.log("parseTwilioWebhookBody");
{
  const parsed = parseTwilioWebhookBody({
    From: "whatsapp:+31612345678",
    Body: "  Ik moet morgen de tandarts bellen  ",
  });
  check("strips whatsapp: prefix", parsed.fromE164 === "+31612345678");
  check("trims body", parsed.body === "Ik moet morgen de tandarts bellen");
}

console.log("verifyTwilioSignature (SKIP flag)");
{
  const ok = verifyTwilioSignature(undefined, "https://example.com/webhooks/whatsapp", {});
  check("skip flag bypasses check", ok === true);
}

console.log("buildSystemPrompt");
{
  const prompt = buildSystemPrompt({
    user: {
      id: "00000000-0000-0000-0000-000000000000",
      phone_e164: "+31612345678",
      display_name: "Per",
      timezone: "Europe/Amsterdam",
      onboarding_state: "done",
      personality_preset: "direct",
      created_at: new Date().toISOString(),
    },
    nowIso: new Date().toISOString(),
  });
  check("includes user name", prompt.includes("Per"));
  check("includes create_task guidance", prompt.includes("create_task"));
  check("includes direct-style tone", prompt.includes("Kort, zakelijk"));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll offline checks passed. This does not verify the live Claude/Supabase/Twilio calls.");
}
