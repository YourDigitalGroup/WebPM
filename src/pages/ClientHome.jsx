import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Ticket from "../components/Ticket.jsx";

const OPEN = ["pending", "completed", "awaiting_confirmation", "needs_info"];

export default function ClientHome({ profile }) {
  const { slug } = useParams();
  const [requests, setRequests] = useState(null);
  const [sites, setSites] = useState([]);
  const [picked, setPicked] = useState("");

  useEffect(() => {
    let live = true;

    Promise.all([
      supabase
        .from("requests")
        .select("id, status, page_url, created_at, request_types(label), sites(name)")
        .order("created_at", { ascending: false })
        .limit(60),
      supabase.from("sites").select("id, name, url").eq("status", "active").order("name"),
    ]).then(([r, s]) => {
      if (!live) return;
      setRequests(r.data ?? []);
      setSites(s.data ?? []);
      if ((s.data ?? []).length) setPicked(s.data[0].url);
    });

    return () => { live = false; };
  }, []);

  const first = profile?.full_name?.split(" ")[0];
  const open = (requests ?? []).filter((r) => OPEN.includes(r.status));
  const past = (requests ?? []).filter((r) => !OPEN.includes(r.status));

  return (
    <>
      <h1>{first ? `Hello, ${first}` : "Your website"}</h1>
      <p className="lede">
        The easiest way to ask for a change is to open your site and point at it.
      </p>

      {/* Primary path: open their own site, where the feedback tab lives.
          Pointing at the thing beats describing where it is.
          One site gets a plain button; several get a picker, since one
          customer already has six and a stack of buttons doesn't scale. */}
      {sites.length === 1 && (
        <a className="btn" href={sites[0].url} target="_blank" rel="noreferrer">
          Open my site
        </a>
      )}

      {sites.length > 1 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            aria-label="Choose a site"
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            style={{ maxWidth: 320 }}
          >
            {sites.map((s) => <option key={s.id} value={s.url}>{s.name}</option>)}
          </select>
          <a className="btn" href={picked} target="_blank" rel="noreferrer">Open site</a>
        </div>
      )}

      {sites.length > 0 && (
        <p className="muted" style={{ marginTop: 14 }}>
          Your site opens in a new tab. Click the tab on the edge of the screen,
          then click whatever you'd like changed and tell us what to do.
        </p>
      )}

      {/* Fallback for things with nothing to point at */}
      <p style={{ marginTop: 18 }}>
        <Link className="linkbtn" to={`/${slug}/new`}>
          Nothing to point at? Send us a note instead
        </Link>
      </p>

      {requests === null && <p className="loading">Loading…</p>}

      {requests !== null && requests.length === 0 && sites.length === 0 && (
        <div className="empty" style={{ marginTop: 26 }}>
          <p>No site is connected to your account yet.</p>
          <p className="muted" style={{ margin: 0 }}>
            Your account manager can sort that out.
          </p>
        </div>
      )}

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
