import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { Stamp, shortRef, formatDate } from "../components/Ticket.jsx";

// Everything, across every client. TeamQueue deliberately stops at "mine",
// and hides its own overflow list from admins and account managers, because
// their queue would otherwise be the whole company's. This is where that
// went: one list, filterable, so oversight has somewhere to look without
// burying the person who only needs their own work.

const CAP = 500;

const STATUSES = [
  ["pending", "In progress"],
  ["needs_info", "Needs info"],
  ["completed", "Ready to check"],
  ["awaiting_confirmation", "Ready to check"],
  ["closed", "Closed"],
  ["cancelled", "Cancelled"],
];

export default function ManageQueue() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("open");
  const [owner, setOwner] = useState("");

  useEffect(() => {
    let live = true;

    supabase
      .from("requests")
      .select(`id, status, page_url, due_date, created_at, scheduled_start,
               request_types(label), sites(name, platform),
               assigned:assigned_to(full_name)`)
      .order("due_date", { nullsFirst: false })
      .limit(CAP)
      .then(({ data }) => { if (live) setRows(data ?? []); });

    return () => { live = false; };
  }, []);

  // Built from what came back rather than from a roster, so the filter only
  // ever offers names that actually have work attached.
  const owners = useMemo(() => {
    const seen = new Set();
    (rows ?? []).forEach((r) => { if (r.assigned?.full_name) seen.add(r.assigned.full_name); });
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const today = new Date().toISOString().slice(0, 10);

  const shown = (rows ?? []).filter((r) => {
    if (status === "open" && !["pending", "needs_info"].includes(r.status)) return false;
    if (status && status !== "open" && r.status !== status) return false;
    if (owner === "unassigned" && r.assigned?.full_name) return false;
    if (owner && owner !== "unassigned" && r.assigned?.full_name !== owner) return false;
    return true;
  });

  const overdue = shown.filter(
    (r) => r.due_date && r.due_date < today && r.status === "pending"
  ).length;

  if (rows === null) return <p className="loading">Loading…</p>;

  return (
    <>
      <Link className="back" to="/team">&larr; My queue</Link>
      <h1>All requests</h1>
      <p className="lede">
        {shown.length} {shown.length === 1 ? "request" : "requests"}
        {overdue > 0 && <> · {overdue} overdue</>}
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 22px" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="open">Open work</option>
          <option value="">Any status</option>
          {STATUSES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {owners.length > 1 && (
          <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Filter by owner">
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {owners.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        )}

        {(status !== "open" || owner) && (
          <button className="linkbtn" onClick={() => { setStatus("open"); setOwner(""); }}>
            Reset
          </button>
        )}
      </div>

      {shown.length === 0 && (
        <div className="empty"><p style={{ margin: 0 }}>Nothing matches that.</p></div>
      )}

      {shown.map((r) => <Row key={r.id} request={r} today={today} />)}

      {rows.length === CAP && (
        <p className="muted" style={{ marginTop: 22 }}>
          Showing the first {CAP} requests by due date. Narrow the filters to see past that.
        </p>
      )}
    </>
  );
}

function Row({ request, today }) {
  const late = request.due_date && request.due_date < today && request.status === "pending";

  return (
    <Link className="ticket" to={`/team/${request.id}`}>
      <div className="ticket-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="title">{request.sites?.name ?? "Site"}</p>
          <span className="ref">
            #{shortRef(request.id)} · {request.request_types?.label ?? "Request"}
          </span>
        </div>
        <Stamp status={late ? "needs_info" : request.status} />
      </div>
      <dl className="rows">
        {request.page_url && <div className="row"><dt>Page</dt><dd>{request.page_url}</dd></div>}
        <div className="row">
          <dt>Due</dt>
          <dd style={late ? { color: "var(--warn)", fontWeight: 500 } : undefined}>
            {formatDate(request.due_date)}{late ? " · overdue" : ""}
          </dd>
        </div>
        <div className="row">
          <dt>Owner</dt>
          <dd>{request.assigned?.full_name ?? "Unassigned"}</dd>
        </div>
      </dl>
    </Link>
  );
}
