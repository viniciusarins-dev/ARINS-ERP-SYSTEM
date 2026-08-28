import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MembershipRole } from "@arins/shared";

export interface CurrentOrganization {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
}

/**
 * The signed-in user's first organization (ordered by membership
 * creation), or null if they haven't created/joined one yet. MVP scope: a
 * user operates one organization at a time; the schema already supports
 * multiple memberships for a future org switcher.
 */
export async function getCurrentOrganization(
  supabase: SupabaseClient<Database>
): Promise<CurrentOrganization | null> {
  const { data, error } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, slug)")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.organizations) return null;

  const org = data.organizations as unknown as { id: string; name: string; slug: string };

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    role: data.role,
  };
}
