import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { Stamp, shortRef, formatDate } from "../components/Ticket.jsx";

// The team's morning view. Mine first, because that's what the calendar
// reminder points at; everything else is available but out of the way.
export default function TeamQueue({ user, profile, role }) {
  const [mine, setMine] = useState(null);
  const [all, setAll] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const oversight = role === "admin" || role === "account_manager";

  useEffect(() => {
    let live = true;

    const columns = `id, status, page_url, due_date, created_at, scheduled_start,
                     request_types(label), sites(name, platform),
                     assigned:assigned_to(full_name)`;

    Promise.all([
      supabase.from("requests").select(columns)
        .eq("assigned_to", user.id).eq("status", "pending")
        .order("scheduled_start", { nullsFirst: false }),
      supabase.from("requests").select(columns)
        .in("status", ["pending", "needs_info"])
        .order("due_date").limit(100),
    ]).then(([m, a]) => {
      if (!live) return;
      setMine(m.data ?? []);
      setAll(a.data ?? []);
    });

    return () => { live = false; };
  }, [user.id]);

  const first = profile?.full_name?.split(" ")[0];
  const others = all.filter((r) => !(mine ?? []).some((x) => x.id === r.id));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1>{first ? `${first}'s queue` : "Queue"}</h1>
      <p className="lede">
        {mine === null ? "\u00a0"
          : mine.length === 0 ? "Nothing waiting on you."
          : `${mine.length} ${mine.length === 1 ? "request" : "requests"} to work through.`}
      </p>

      {mine === null && <p className="loading">Loading…</p>}

      {mine?.length === 0 && (
        <div className="empty"><p style={{ margin: 0 }}>Queue's clear.</p></div>
      )}

      {mine?.map((r) => <Row key={r.id} request={r} today={today} />)}

      {(oversight || others.length > 0) && (
        <>
          <div className="section-head">
            <h2 style={{ margin: 0 }}>Everything else</h2>
            <button className="linkbtn" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Hide" : `Show ${others.length}`}
            </button>
          </div>
          {showAll && others.map((r) => <Row key={r.id} request={r} today={today} showOwner />)}
        </>
      )}
    </>
  );
}

function Row({ request, today, showOwner }) {
  const overdue = request.due_date && request.due_date < today && request.status === "pending";

  return (
    <Link className="ticket" to={`/team/${request.id}`}>
      <div className="ticket-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="title">{request.sites?.name ?? "Site"}</p>
          <span className="ref">
            #{shortRef(request.id)} · {request.request_types?.label ?? "Request"}
          </span>
        </div>
        <Stamp status={overdue ? "needs_info" : request.status} />
      </div>
      <dl className="rows">
        {request.page_url && <div className="row"><dt>Page</dt><dd>{request.page_url}</dd></div>}
        <div className="row">
          <dt>Due</dt>
          <dd style={overdue ? { color: "var(--warn)", fontWeight: 500 } : undefined}>
            {formatDate(request.due_date)}{overdue ? " · overdue" : ""}
          </dd>
        </div>
        {showOwner && (
          <div className="row"><dt>Owner</dt><dd>{request.assigned?.full_name ?? "Unassigned"}</dd></div>
        )}
      </dl>
    </Link>
  );
}
