import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

// The client list. Its main job is the account executive handles: those drive
// who gets @mentioned on the partner board, they're set once at onboarding,
// and people change jobs. Without this screen nobody can fix a stale one.

export default function Clients() {
  const [rows, setRows] = useState(null);
  const [partner, setPartner] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    const { data } = await supabase
      .from("advertiser_overview").select("*").order("advertiser");
    setRows(data ?? []);
  }

  useEffect(() => { load(); }, []);

  const partners = useMemo(() => {
    const seen = new Map();
    (rows ?? []).forEach((r) => { if (r.partner_name) seen.set(r.partner_slug, r.partner_name); });
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const shown = partner ? (rows ?? []).filter((r) => r.partner_slug === partner) : (rows ?? []);

  function startEdit(row) {
    setError(null);
    setEditing(row.id);
    setDraft((row.ae_trello_handles ?? []).join(", "));
  }

  async function save(id) {
    setSaving(true);
    setError(null);

    const handles = draft.split(/[,\s]+/).map((h) => h.trim()).filter(Boolean);
    const { error: err } = await supabase.rpc("update_ae_handles", {
      p_advertiser_id: id,
      p_handles: handles,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }

    setEditing(null);
    load();
  }

  if (rows === null) return <p className="loading">Loading…</p>;

  return (
    <>
      <Link className="back" to="/team">&larr; My queue</Link>
      <h1>Clients</h1>
      <p className="lede">
        {rows.length} {rows.length === 1 ? "client" : "clients"} across {partners.length} groups
      </p>

      {error && <div className="notice bad">{error}</div>}

      {partners.length > 1 && (
        <div className="filters">
          <select value={partner} onChange={(e) => setPartner(e.target.value)} aria-label="Filter by group">
            <option value="">All groups</option>
            {partners.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
          {partner && <button className="linkbtn" onClick={() => setPartner("")}>Clear</button>}
        </div>
      )}

      {shown.length === 0 && (
        <div className="empty">
          <p>No clients yet.</p>
          <Link className="btn ghost small" to="/team/new-client">Add the first one</Link>
        </div>
      )}

      {shown.map((r) => (
        <div className="ticket" key={r.id}>
          <div className="ticket-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="title">{r.advertiser}</p>
              <span className="ref">
                {r.partner_name ?? "No group"}
                {r.site_count > 1 && <> · {r.site_count} sites</>}
              </span>
            </div>
            {r.open_requests > 0 && (
              <span className="stamp open">{r.open_requests} open</span>
            )}
          </div>

          <dl className="rows">
            <div className="row">
              <dt>Contact</dt>
              <dd>{r.contact_name ?? r.contact_email ?? <span style={{ color: "var(--warn)" }}>None set</span>}</dd>
            </div>
            <div className="row">
              <dt>Account manager</dt>
              <dd>{r.account_manager ?? "—"}</dd>
            </div>
            <div className="row">
              <dt>Content</dt>
              <dd>{r.content_specialist ?? <span style={{ color: "var(--warn)" }}>Nobody</span>}</dd>
            </div>

            <div className="row">
              <dt>Account exec</dt>
              <dd>
                {editing === r.id ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="jsmith22, dlee"
                      style={{ flex: 1, minWidth: 180, padding: "8px 10px", fontSize: 14 }}
                      autoFocus
                    />
                    <button className="btn small" onClick={() => save(r.id)} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button className="linkbtn" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                    <span>
                      {(r.ae_trello_handles ?? []).length
                        ? r.ae_trello_handles.map((h) => `@${h}`).join("  ")
                        : <span style={{ color: "var(--warn)" }}>Nobody gets notified</span>}
                    </span>
                    <button className="linkbtn" onClick={() => startEdit(r)}>Edit</button>
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </div>
      ))}

      <p className="muted" style={{ marginTop: 22 }}>
        Account executives are Trello handles, not logins. Whoever is listed gets
        @mentioned on the group's board when a request comes in and when it's finished —
        Trello emails them. They only get the notification if they're a member of that board.
      </p>
    </>
  );
}
