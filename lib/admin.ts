import { supabase } from "@/lib/supabase";

// Only used to show or hide the admin buttons.
// The real protection is in the database, so students cannot post announcements.
export async function checkIsAdmin(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return Boolean(data);
}