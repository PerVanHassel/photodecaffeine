import { db } from "./db.ts";

// Looks up a Supabase Auth user's email + display name by id.
export async function getPortalUser(userId: string): Promise<{ email: string; name: string } | null> {
  try {
    const { data, error } = await db.auth.admin.getUserById(userId);
    if (error || !data?.user?.email) return null;
    return {
      email: data.user.email,
      name: data.user.user_metadata?.name || data.user.email,
    };
  } catch {
    return null;
  }
}
