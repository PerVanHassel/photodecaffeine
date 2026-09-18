import { createClient } from "@supabase/supabase-js";
import { env } from "../config.js";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export interface AgentUser {
  id: string;
  phone_e164: string;
  display_name: string | null;
  timezone: string;
  onboarding_state: "new" | "in_progress" | "done";
  personality_preset: string;
  created_at: string;
}

export async function findOrCreateUser(phoneE164: string): Promise<AgentUser> {
  const { data: existing, error: findError } = await supabase
    .from("agent_users")
    .select("*")
    .eq("phone_e164", phoneE164)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing as AgentUser;

  const { data: created, error: createError } = await supabase
    .from("agent_users")
    .insert({ phone_e164: phoneE164 })
    .select("*")
    .single();

  if (createError) throw createError;
  return created as AgentUser;
}
