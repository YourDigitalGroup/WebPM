import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const NEUTRAL = { name: "Website Requests", logo: null, color: "#1F2937", slug: null };

// Partner branding by URL slug. Readable without a session so the sign-in
// page already carries the partner's identity.
export function useBrand(slug) {
  const [brand, setBrand] = useState(slug ? null : NEUTRAL);

  useEffect(() => {
    let live = true;
    if (!slug) { setBrand(NEUTRAL); return; }

    supabase.rpc("public_brand", { p_slug: slug }).then(({ data }) => {
      if (live) setBrand(data ?? NEUTRAL);
    });

    return () => { live = false; };
  }, [slug]);

  useEffect(() => {
    if (brand?.color) document.documentElement.style.setProperty("--brand", brand.color);
  }, [brand]);

  return brand;
}
