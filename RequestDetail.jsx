import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { Stamp, shortRef, formatDate } from "../components/Ticket.jsx";
import { isTeam } from "../lib/useSession.js";

// Field keys arrive from request_types.intake_schema and from BugHerd,
// so they're machine-shaped. Give the common ones human labels.
const LABELS = {
  description: "What they asked for",
  new_text: "What it should say",
  alt_text: "Image description",
  video_url: "Video link",
  details: "Details",
  new_hours: "New hours",
  desired: "What they'd like",
  changes: "What should change",
  what_happens: "What happens",
  page_title: "Page title",
  content: "Content",
  browser: "Browser",
  resolution: "Screen size",
  requester: "Requested by",
  timeline: "Timing",
  recipient: "Send submissions to",
  current_behavior: "How it works now",
  desired_behavior: "How it should work",
  menu_placement: "Menu placement",
  effective_date: "Effective date",
};

const label = (k) => LABELS[k] ?? k.replace(/_/g, " ");

// Technical context is useful but shouldn't crowd out the request itself
const SECONDARY = new Set(["browser", "resolution", "requester", "source"]);

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
      .select(`id, status, page_url, form_data, created_at, due_date, source,
               completion_note, completion_url, completed_at, revision_note, reopen_count,
               screenshot_url, element_html, external_task_url,
               request_types(label, description), sites(name, url, platform),
               assigned:assigned_to(id, full_name)`)
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
  const entries = Object.entries(request.form_data ?? {}).filter(([k, v]) => v && k !== "source");
  const primary = entries.filter(([k]) => !SECONDARY.has(k));
  const secondary = entries.filter(([k]) => SECONDARY.has(k));

  const isAssignee = request.assigned?.id === user.id;
  const canComplete = team && request.status === "pending";

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

      {/* What they actually asked for, first and unmissable */}
      {primary.map(([k, v]) => (
        <div key={k} style={{ marginTop: 22 }}>
          <span className="eyebrow">{label(k)}</span>
          <p style={{ fontSize: 17, lineHeight: 1.5, margin: "6px 0 0" }}>{String(v)}</p>
        </div>
      ))}

      {/* The pin. For visual requests this answers the question on its own. */}
      {request.screenshot_url && (
        <div style={{ marginTop: 24 }}>
          <span className="eyebrow">Where they pointed</span>
          <a href={request.screenshot_url} target="_blank" rel="noreferrer"
             style={{ display: "block", marginTop: 8 }}>
            <img
              src={request.screenshot_url}
              alt="Screenshot with the client's pin marked"
              style={{ width: "100%", border: "1px solid var(--edge)", borderRadius: "var(--r)", display: "block" }}
            />
          </a>
          <p className="muted" style={{ marginTop: 6 }}>Tap to open full size</p>
        </div>
      )}

      <dl className="rows" style={{ background: "#fff", border: "1px solid var(--edge)", borderRadius: "var(--r)", marginTop: 24 }}>
        <div className="row"><dt>Site</dt><dd>{request.sites?.name ?? "—"}</dd></div>
        {request.page_url && (
          <div className="row">
            <dt>Page</dt>
            <dd><a href={request.page_url} target="_blank" rel="noreferrer">{request.page_url}</a></dd>
          </div>
        )}
        <div className="row"><dt>Submitted</dt><dd>{formatDate(request.created_at)}</dd></div>
        {team && (
          <>
            <div className="row"><dt>Platform</dt><dd>{request.sites?.platform ?? "—"}</dd></div>
            <div className="row"><dt>Assigned</dt><dd>{request.assigned?.full_name ?? "Unassigned"}</dd></div>
            <div className="row"><dt>Due</dt><dd>{formatDate(request.due_date)}</dd></div>
            {secondary.map(([k, v]) => (
              <div className="row" key={k}><dt>{label(k)}</dt><dd>{String(v)}</dd></div>
            ))}
          </>
        )}
      </dl>

      {/* The exact element, for whoever has to change it */}
      {team && request.element_html && (
        <div style={{ marginTop: 22 }}>
          <span className="eyebrow">The element they pinned</span>
          <pre style={{
            marginTop: 8, padding: "12px 14px", background: "#fff",
            border: "1px solid var(--edge)", borderRadius: "var(--r)",
            font: "13px/1.5 var(--mono)", overflowX: "auto", whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}>{request.element_html}</pre>
        </div>
      )}

      {team && request.external_task_url && (
        <p className="muted" style={{ marginTop: 12 }}>
          <a href={request.external_task_url} target="_blank" rel="noreferrer">Open the original pin &rarr;</a>
        </p>
      )}

      {request.revision_note && (
        <div className="notice bad" style={{ marginTop: 18 }}>
          <strong>Revision asked for:</strong> {request.revision_note}
        </div>
      )}

      {request.completion_note && (
        <>
          <div className="section-head"><h2 style={{ margin: 0 }}>What we did</h2></div>
          <p>{request.completion_note}</p>
          {request.completion_url && (
            <p><a href={request.completion_url} target="_blank" rel="noreferrer">See it live &rarr;</a></p>
          )}
        </>
      )}

      {canComplete && (
        <>
          <div className="section-head"><h2 style={{ margin: 0 }}>Mark it complete</h2></div>

          {!isAssignee && (
            <div className="notice">
              This is assigned to {request.assigned?.full_name ?? "nobody"}. You can still
              complete it, and you'll be recorded as who did.
            </div>
          )}

          <p className="muted" style={{ marginBottom: 18 }}>
            Both fields go straight into the client's email, so write them for the client
            rather than for us.
          </p>

          {error && <div className="notice bad">{error}</div>}

          <form onSubmit={markComplete}>
            <div className="field">
              <label className="lbl" htmlFor="note">
                What you did
                <span className="hint">One line is plenty</span>
              </label>
              <textarea
                id="note" required value={note}
                placeholder="Replaced the team photo with the new one."
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="lbl" htmlFor="url">
                Link to the page that changed
                <span className="hint">The exact page — this is what they'll click</span>
              </label>
              <input
                id="url" type="url" required placeholder="https://"
                value={url} onChange={(e) => setUrl(e.target.value)}
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
