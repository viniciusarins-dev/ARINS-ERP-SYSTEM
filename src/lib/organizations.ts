import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MembershipRole } from "@/lib/supabase/types";

export interface CurrentOrganization {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
}

/**
 * Returns the signed-in user's first organization (ordered by membership
 * creation), or null if they haven't created/joined one yet. MVP scope: a
 * user operates one organization at a time; the schema already supports
 * multiple memberships for a future org switcher.
 */
export async function getCurrentOrganization(): Promise<CurrentOrganization | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

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
