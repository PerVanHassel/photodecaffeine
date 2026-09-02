import { supabase } from "../db/supabase.js";

export interface ToolContext {
  userId: string;
  currentMessageId: string;
}

// Each handler mirrors one tool in definitions.ts. Handlers are the only
// place allowed to write state -- Claude can never mutate the database by
// itself, only by calling these through the tool-use loop, and every query
// below is scoped to ctx.userId regardless of what the model claims.
export const toolHandlers: Record<
  string,
  (input: any, ctx: ToolContext) => Promise<unknown>
> = {
  async create_task(input, ctx) {
    const { data, error } = await supabase
      .from("agent_tasks")
      .insert({
        user_id: ctx.userId,
        title: input.title,
        description: input.description ?? null,
        due_at: input.due_at ?? null,
        priority: input.priority ?? "medium",
        source: input.source ?? "inferred",
        source_message_id: ctx.currentMessageId,
      })
      .select("id, title, due_at, priority")
      .single();
    if (error) throw error;
    return { created: true, task: data };
  },

  async create_goal_as_task(input, ctx) {
    const { data, error } = await supabase
      .from("agent_tasks")
      .insert({
        user_id: ctx.userId,
        title: input.title,
        description: input.description ?? null,
        priority: "low",
        source: "inferred",
        source_message_id: ctx.currentMessageId,
      })
      .select("id, title")
      .single();
    if (error) throw error;
    return { created: true, goal: data };
  },

  async update_task(input, ctx) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.status) {
      updates.status = input.status;
      if (input.status === "done") updates.completed_at = new Date().toISOString();
    }
    if (input.due_at) updates.due_at = input.due_at;
    if (input.priority) updates.priority = input.priority;

    const { data, error } = await supabase
      .from("agent_tasks")
      .update(updates)
      .eq("id", input.task_id)
      .eq("user_id", ctx.userId) // hard scoping: never trust task_id alone
      .select("id, title, status, due_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { updated: false, reason: "task not found for this user" };
    return { updated: true, task: data };
  },

  async list_open_tasks(input, ctx) {
    const { data, error } = await supabase
      .from("agent_tasks")
      .select("id, title, due_at, priority, status")
      .eq("user_id", ctx.userId)
      .in("status", ["open", "in_progress", "snoozed"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(input.limit ?? 20);
    if (error) throw error;
    return { tasks: data };
  },

  async save_memory_fact(input, ctx) {
    // NOTE (spike scope): no embedding is generated here yet. Production
    // needs an embedding call (e.g. Voyage AI, Anthropic's recommended
    // embeddings partner) before insert so search_memory can do real
    // semantic search instead of the ILIKE fallback below. See README.
    const { data, error } = await supabase
      .from("agent_memory_facts")
      .insert({
        user_id: ctx.userId,
        type: input.type,
        content: input.content,
        source_message_id: ctx.currentMessageId,
      })
      .select("id, type, content")
      .single();
    if (error) throw error;
    return { saved: true, fact: data };
  },

  async search_memory(input, ctx) {
    // Spike fallback: keyword search instead of vector similarity.
    // Swap for an embedding-based match once an embeddings provider is wired up.
    const { data, error } = await supabase
      .from("agent_memory_facts")
      .select("id, type, content, created_at")
      .eq("user_id", ctx.userId)
      .ilike("content", `%${input.query}%`)
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 5);
    if (error) throw error;
    return { facts: data };
  },

  async schedule_reminder(input, ctx) {
    const { data, error } = await supabase
      .from("agent_reminders")
      .insert({
        user_id: ctx.userId,
        task_id: input.task_id ?? null,
        fire_at: input.fire_at,
        note: input.note,
      })
      .select("id, fire_at, note")
      .single();
    if (error) throw error;
    return { scheduled: true, reminder: data };
  },
};
