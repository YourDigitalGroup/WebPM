import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Ticket from "../components/Ticket.jsx";

// The client's landing page. Most of what they ask for is ordinary — hours,
// a phone number, a photo swap — so the catalogue leads. Pointing at something
// on the live site is the better answer for a minority of requests, so it sits
// at the bottom as an offer rather than the front door.

const GROUPS = [
  { key: "content", label: "Content and copy" },
  { key: "build",   label: "Fixes and changes" },
  { key: "scope",   label: "Something new" },
];

const OPEN = ["pending", "completed", "awaiting_confirmation", "needs_info"];

export default function ClientHome({ profile }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [types, setTypes] = useState(null);
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState("");
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    let live = true;

    Promise.all([
      supabase.from("request_types")
        .select("id, key, label, description, category")
        .eq("is_active", true).order("sort_order"),
      supabase.from("sites")
        .select("id, name, url").eq("status", "active").order("name"),
      supabase.from("requests")
        .select("id, status, page_url, created_at, request_types(label), sites(name)")
        .order("created_at", { ascending: false }).limit(40),
    ]).then(([t, s, r]) => {
      if (!live) return;
      setTypes(t.data ?? []);
      setSites(s.data ?? []);
      setRequests(r.data ?? []);
      if ((s.data ?? []).length) setSiteId(s.data[0].id);
    });

    return () => { live = false; };
  }, []);

  const first = profile?.full_name?.split(" ")[0];
  const open = requests.filter((r) => OPEN.includes(r.status));
  const past = requests.filter((r) => !OPEN.includes(r.status));

  function start(type) {
    const q = new URLSearchParams({ type: type.key });
    if (siteId) q.set("site", siteId);
    navigate(`/${slug}/new?${q}`);
  }

  if (types === null) return <p className="loading">Loading…</p>;

  if (sites.length === 0) {
    return (
      <>
        <h1>{first ? `Hello, ${first}` : "Your website"}</h1>
        <div className="empty" style={{ marginTop: 20 }}>
          <p>No site is connected to your account yet.</p>
          <p className="muted" style={{ margin: 0 }}>Your account manager can sort that out.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>{first ? `Hello, ${first}` : "Your website"}</h1>
      <p className="lede">What would you like changed?</p>

      {sites.length > 1 && (
        <div className="site-bar">
          <span className="eyebrow">Site</span>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)} aria-label="Choose a site">
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {GROUPS.map((g) => {
        const inGroup = types.filter((t) => t.category === g.key);
        if (inGroup.length === 0) return null;
        return (
          <section className="picker-group" key={g.key}>
            <span className="eyebrow">{g.label}</span>
            <div className="picker-grid">
              {inGroup.map((t) => (
                <button className="picker-card" key={t.id} onClick={() => start(t)}>
                  <strong>{t.label}</strong>
                  {t.description && <span>{t.description}</span>}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {open.length > 0 && (
        <>
          <div className="section-head">
            <h2 style={{ margin: 0 }}>In progress</h2>
            <span className="eyebrow">{open.length}</span>
          </div>
          {open.map((r) => <Ticket key={r.id} request={r} to={`/${slug}/${r.id}`} />)}
        </>
      )}

      {past.length > 0 && (
        <>
          <div className="section-head">
            <h2 style={{ margin: 0 }}>Finished</h2>
            <span className="eyebrow">{past.length}</span>
          </div>
          {past.map((r) => <Ticket key={r.id} request={r} to={`/${slug}/${r.id}`} />)}
        </>
      )}
    </>
  );
}
