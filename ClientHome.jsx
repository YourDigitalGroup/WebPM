import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Ticket from "../components/Ticket.jsx";

const OPEN = ["pending", "completed", "awaiting_confirmation", "needs_info"];

export default function ClientHome({ profile }) {
  const { slug } = useParams();
  const [requests, setRequests] = useState(null);
  const [siteCount, setSiteCount] = useState(0);

  useEffect(() => {
    let live = true;

    Promise.all([
      supabase
        .from("requests")
        .select("id, status, page_url, created_at, request_types(label), sites(name)")
        .order("created_at", { ascending: false })
        .limit(60),
      supabase.from("sites").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]).then(([r, s]) => {
      if (!live) return;
      setRequests(r.data ?? []);
      setSiteCount(s.count ?? 0);
    });

    return () => { live = false; };
  }, []);

  const first = profile?.full_name?.split(" ")[0];
  const open = (requests ?? []).filter((r) => OPEN.includes(r.status));
  const past = (requests ?? []).filter((r) => !OPEN.includes(r.status));

  return (
    <>
      <h1>{first ? `Hello, ${first}` : "Your website requests"}</h1>
      <p className="lede">
        Ask for a change to your site and we'll take it from here.
      </p>

      <Link className="btn" to={`/${slug}/new`}>Request a change</Link>

      {requests === null && <p className="loading">Loading…</p>}

      {requests !== null && requests.length === 0 && (
        <div className="empty" style={{ marginTop: 26 }}>
          <p>No requests yet.</p>
          <p className="muted" style={{ margin: 0 }}>
            {siteCount === 0
              ? "Once your site is connected you'll be able to request changes here."
              : "When you need something changed, start above."}
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
