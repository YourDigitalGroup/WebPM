import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { Stamp, shortRef, formatDate } from "../components/Ticket.jsx";
import { isTeam } from "../lib/useSession.js";

export default function RequestDetail({ user, role }) {
  const { slug, id } = useParams();
  const [params] = useSearchParams();
  const justCreated = params.get("new") === "1";

  const [request, setRequest] = useState(undefined);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const team = isTeam(role);

  async function load() {
    const { data } = await supabase
      .from("requests")
      .select(`id, status, page_url, form_data, created_at, due_date, completion_note,
               completion_url, completed_at, revision_note, reopen_count,
               request_types(label, description), sites(name, url, platform),
               assigned:assigned_to(full_name)`)
      .eq("id", id)
      .maybeSingle();
    setRequest(data ?? null);
    if (data?.page_url) setUrl((u) => u || data.page_url);
  }

  useEffect(() => { load(); }, [id]);

  async function markComplete(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error: err } = await supabase.from("requests").update({
      status: "completed",
      completed_by: user.id,
      completed_at: new Date().toISOString(),
      completion_note: note.trim(),
      completion_url: url.trim(),
    }).eq("id", id);

    setBusy(false);
    if (err) setError("That didn't save. Try again.");
    else load();
  }

  if (request === undefined) return <p className="loading">Loading…</p>;

  if (request === null) {
    return (
      <div className="empty">
        <p>We couldn't find that request.</p>
        <Link className="btn ghost small" to={`/${slug}`}>Back to your requests</Link>
      </div>
    );
  }

  const type = request.request_types?.label ?? "Request";
  const answers = Object.entries(request.form_data ?? {})
    .filter(([k, v]) => v && k !== "source");

  return (
    <>
      <Link className="back" to={team ? "/team" : `/${slug}`}>&larr; Back</Link>

      {justCreated && (
        <div className="notice good">
          Got it. We'll email you when it's live — nothing else needed from you.
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>{type}</h1>
          <span className="ref">#{shortRef(request.id)}</span>
        </div>
        <Stamp status={request.status} />
      </div>

      <dl className="rows" style={{ background: "#fff", border: "1px solid var(--edge)", borderRadius: "var(--r)", marginTop: 20 }}>
        <div className="row"><dt>Site</dt><dd>{request.sites?.name ?? "—"}</dd></div>
        {request.page_url && <div className="row"><dt>Page</dt><dd>{request.page_url}</dd></div>}
        <div className="row"><dt>Submitted</dt><dd>{formatDate(request.created_at)}</dd></div>
        {team && (
          <>
            <div className="row"><dt>Platform</dt><dd>{request.sites?.platform ?? "—"}</dd></div>
            <div className="row"><dt>Assigned</dt><dd>{request.assigned?.full_name ?? "Unassigned"}</dd></div>
            <div className="row"><dt>Due</dt><dd>{formatDate(request.due_date)}</dd></div>
          </>
        )}
        {answers.map(([k, v]) => (
          <div className="row" key={k}>
            <dt>{k.replace(/_/g, " ")}</dt>
            <dd>{String(v)}</dd>
          </div>
        ))}
      </dl>

      {request.revision_note && (
        <div className="notice bad" style={{ marginTop: 18 }}>
          <strong>Revision asked for:</strong> {request.revision_note}
        </div>
      )}

      {request.completion_note && (
        <>
          <div className="section-head"><h2 style={{ margin: 0 }}>What we did</h2></div>
          <p>{request.completion_note}</p>
          {request.completion_url && <p><a href={request.completion_url}>See it live &rarr;</a></p>}
        </>
      )}

      {team && request.status === "pending" && (
        <>
          <div className="section-head"><h2 style={{ margin: 0 }}>Mark it complete</h2></div>
          <p className="muted" style={{ marginBottom: 18 }}>
            Both go straight into the client's email, so write them for the client rather than for us.
          </p>

          {error && <div className="notice bad">{error}</div>}

          <form onSubmit={markComplete}>
            <div className="field">
              <label className="lbl" htmlFor="note">
                What you did
                <span className="hint">One line is plenty</span>
              </label>
              <textarea
                id="note"
                required
                value={note}
                placeholder="Replaced the header photo with the new team shot."
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="lbl" htmlFor="url">
                Link to the page that changed
                <span className="hint">The exact page, not the home page — this is what they'll click</span>
              </label>
              <input
                id="url"
                type="url"
                required
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="btn-row">
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Mark complete"}
              </button>
            </div>
          </form>
        </>
      )}
    </>
  );
}
