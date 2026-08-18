import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

// Adding a client used to mean writing SQL. This is the screen that replaces it:
// one form that creates the advertiser and their site, reads their pages, makes
// the contact's login, and sends the branded invitation.

export default function Onboard() {
  const [partners, setPartners] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [form, setForm] = useState({
    partner_slug: "",
    advertiser_name: "",
    site_name: "",
    site_url: "",
    platform: "wordpress",
    contact_name: "",
    contact_email: "",
    ae_handles: "",
    content_specialist: "",
    admin_url: "",
    notes: "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    supabase.rpc("partners_for_onboarding").then(({ data }) => setPartners(data ?? []));
    supabase.rpc("assignable_people").then(({ data }) =>
      setSpecialists((data ?? []).filter((p) => p.role === "content_specialist")));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Site name defaults to the advertiser's name, which is right most of the time
    const siteName = form.site_name.trim() || form.advertiser_name.trim();

    const handles = form.ae_handles
      .split(/[,\s]+/).map((h) => h.replace(/^@/, "").trim()).filter(Boolean);

    const { data: created, error: rpcError } = await supabase.rpc("onboard_advertiser", {
      p_partner_slug: form.partner_slug,
      p_advertiser_name: form.advertiser_name.trim(),
      p_site_name: siteName,
      p_site_url: form.site_url.trim(),
      p_platform: form.platform,
      p_ae_handles: handles,
      p_admin_url: form.admin_url.trim() || null,
      p_notes: form.notes.trim() || null,
      p_content_specialist: form.content_specialist || null,
    });

    if (rpcError) {
      setBusy(false);
      setError(rpcError.message);
      return;
    }

    // Second step: login, pages and invitation, which need the service role
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;

    let steps = {};
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboard-client`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            advertiser_id: created.advertiser_id,
            site_id: created.site_id,
            contact_email: form.contact_email.trim(),
            contact_name: form.contact_name.trim() || null,
          }),
        },
      );
      steps = await res.json();
    } catch (err) {
      steps = { ok: false, error: String(err) };
    }

    setBusy(false);
    setDone({
      advertiser: form.advertiser_name.trim(),
      partner: partners.find((p) => p.slug === form.partner_slug)?.name,
      slug: form.partner_slug,
      url: created.site_url,
      email: form.contact_email.trim(),
      steps,
    });
  }

  if (done) {
    const s = done.steps?.steps ?? {};
    return (
      <>
        <h1>{done.advertiser} is set up</h1>
        <p className="lede">Under {done.partner}, at {done.url}</p>

        <dl className="rows" style={{ background: "#fff", border: "1px solid var(--edge)", borderRadius: "var(--r)" }}>
          <div className="row"><dt>Login</dt><dd>{s.user ?? "—"} for {done.email}</dd></div>
          <div className="row"><dt>Pages found</dt><dd>{s.pages ?? "—"}</dd></div>
          <div className="row"><dt>Invitation</dt><dd>{s.invite ?? "—"}</dd></div>
          <div className="row"><dt>Their portal</dt><dd>/{done.slug}</dd></div>
        </dl>

        {s.pages === 0 && (
          <div className="notice" style={{ marginTop: 18 }}>
            No pages were found on that site, so the client won't see a page list.
            Usually means there's no sitemap and the navigation couldn't be read.
          </div>
        )}

        <div className="btn-row">
          <button className="btn" onClick={() => { setDone(null); setForm((f) => ({
            ...f, advertiser_name: "", site_name: "", site_url: "",
            contact_name: "", contact_email: "", admin_url: "", notes: "",
            content_specialist: "",
          })); }}>
            Add another
          </button>
          <Link className="btn ghost" to="/team">Back to the queue</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Link className="back" to="/team">&larr; Back</Link>
      <h1>Add a client</h1>
      <p className="lede">
        Creates their account, reads their site, and emails them an invitation
        branded as their group.
      </p>

      {error && <div className="notice bad">{error}</div>}

      <form onSubmit={submit}>
        <div className="field">
          <label className="lbl" htmlFor="partner">Which group?</label>
          <select id="partner" required value={form.partner_slug} onChange={set("partner_slug")}>
            <option value="">Choose one</option>
            {partners.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label className="lbl" htmlFor="adv">Client name</label>
          <input id="adv" type="text" required value={form.advertiser_name}
                 onChange={set("advertiser_name")} placeholder="Riverside Dental" />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="url">
            Website address
            <span className="hint">We'll read their pages from this</span>
          </label>
          <input id="url" type="text" required value={form.site_url}
                 onChange={set("site_url")} placeholder="riversidedental.com" />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="platform">Platform</label>
          <select id="platform" required value={form.platform} onChange={set("platform")}>
            <option value="wordpress">WordPress</option>
            <option value="fourge">FOURGE</option>
          </select>
        </div>

        <div className="field">
          <label className="lbl" htmlFor="cs">
            Content specialist
            <span className="hint">Leave as the group's default unless this client needs someone else</span>
          </label>
          <select id="cs" value={form.content_specialist} onChange={set("content_specialist")}>
            <option value="">Whoever owns the group</option>
            {specialists.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        <div className="field">
          <label className="lbl" htmlFor="cname">Their contact</label>
          <input id="cname" type="text" value={form.contact_name}
                 onChange={set("contact_name")} placeholder="Dana Whitfield" />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="cemail">
            Their email
            <span className="hint">Where the invitation and every update goes</span>
          </label>
          <input id="cemail" type="email" required value={form.contact_email}
                 onChange={set("contact_email")} placeholder="dana@riversidedental.com" />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="ae">
            Account executive's Trello handle
            <span className="hint">Optional. Separate several with commas</span>
          </label>
          <input id="ae" type="text" value={form.ae_handles}
                 onChange={set("ae_handles")} placeholder="jsmith22" />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="admin">
            Admin login page
            <span className="hint">Optional. Saves the team hunting for it</span>
          </label>
          <input id="admin" type="text" value={form.admin_url}
                 onChange={set("admin_url")} placeholder="riversidedental.com/wp-admin" />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="notes">
            Anything the team should know
            <span className="hint">Optional. Caching, theme quirks, plugins not to touch</span>
          </label>
          <textarea id="notes" value={form.notes} onChange={set("notes")}
                    placeholder="Cloudflare — purge after changes" />
        </div>

        <div className="btn-row">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Setting up…" : "Add client and send invitation"}
          </button>
        </div>
      </form>
    </>
  );
}
