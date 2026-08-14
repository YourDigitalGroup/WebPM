import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// Signed-in user plus their role and display name.
export function useSession() {
  const [state, setState] = useState({ loading: true, user: null, profile: null, role: null });

  useEffect(() => {
    let live = true;

    async function load(user) {
      if (!user) {
        if (live) setState({ loading: false, user: null, profile: null, role: null });
        return;
      }
      const [{ data: profile }, { data: membership }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").eq("id", user.id).maybeSingle(),
        supabase.from("memberships").select("role, organization_id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (live) setState({ loading: false, user, profile, role: membership?.role ?? null });
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => load(session?.user ?? null));

    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}

const TEAM = ["admin", "account_manager", "wordpress_dev", "fourge_dev", "content_specialist"];
export const isTeam = (role) => TEAM.includes(role);
