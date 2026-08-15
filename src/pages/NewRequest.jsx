import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import DynamicForm from "../components/DynamicForm.jsx";

// The fallback path. Pointing at the thing on the live site is better, so this
// is for requests with no visual anchor — new hours, a new page, a quote.
// Deliberately no "which page" field: a client who could answer that reliably
// would have pointed at it instead.

const GROUPS = [
  { key: "content", label: "Content and copy" },
  { key: "build",   label: "Fixes and changes" },
  { key: "scope",   label: "Something new" },
];

export default function NewRequest({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [types, setTypes] = useState(null);
  const [sites, setSites] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [siteId, setSiteId] = useState("");
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.all([
      supabase.from("request_types")
        .select("id, key, label, description, category, intake_schema")
        .eq("is_active", true).order("sort_order"),
      supabase.from("sites").select("id, name, url").eq("status", "active").order("name"),
    ]).then(([t, s]) => {
      if (!live) return;
      setTypes(t.data ?? []);
      setSites(s.data ?? []);
      if ((s.data ?? []).length === 1) setSiteId(s.data[0].id);
    });
    return () => { live = false; };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { data: created, error: insertError } = await supabase
      .from("requests")
      .insert({
        site_id: siteId,
        request_type_id: chosen.id,
        submitted_by: user.id,
        category: chosen.category,
        title: "pending",
        due_date: new Date().toISOString().slice(0, 10),
        form_data: values,
      })
      .select("id")
      .single();

    if (insertError) {
      setBusy(false);
      setError("We couldn't save that. Please try again, or call your account manager.");
      return;
    }

    // Uploads go under the request id, which is what the storage policy checks
    const uploads = Object.entries(files).filter(([, f]) => f);
    for (const [key, file] of uploads) {
      const path = `${created.id}/${key}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("request-assets").upload(path, file, { upsert: true });
      if (!upErr) {
        await supabase.from("request_assets").insert({
          request_id: created.id,
          storage_path: path,
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        });
      }
    }

    navigate(`/${slug}/${created.id}?new=1`);
  }

  if (types === null) return <p className="loading">Loading…</p>;

  if (sites.length === 0) {
    return (
      <>
        <Link className="back" to={`/${slug}`}>&larr; Back</Link>
        <div className="empty">
          <p>No site is connected to your account yet.</p>
          <p className="muted" style={{ margin: 0 }}>Your account manager can sort that out.</p>
        </div>
      </>
    );
  }

  // Step one: what kind of change?
  if (!chosen) {
    return (
      <>
        <Link className="back" to={`/${slug}`}>&larr; Back</Link>
        <h1>What do you need?</h1>
        <p className="lede">
          If it's something you can see on your site, it's quicker to open the site
          and point at it. Otherwise, pick the closest match below.
        </p>

        <div className="types">
          {GROUPS.map((g) => {
            const inGroup = types.filter((t) => t.category === g.key);
            if (inGroup.length === 0) return null;
            return (
              <div className="type-group" key={g.key}>
                <span className="eyebrow">{g.label}</span>
                {inGroup.map((t) => (
                  <button className="type" key={t.id} onClick={() => setChosen(t)}>
                    <strong>{t.label}</strong>
                    {t.description && <span>{t.description}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // Step two: the details that type asks for
  return (
    <>
      <button className="back" onClick={() => setChosen(null)}>&larr; Choose something else</button>
      <h1>{chosen.label}</h1>
      {chosen.description && <p className="lede">{chosen.description}</p>}

      {error && <div className="notice bad">{error}</div>}

      <form onSubmit={submit}>
        {sites.length > 1 && (
          <div className="field">
            <label className="lbl" htmlFor="site">Which site?</label>
            <select id="site" required value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Choose one</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <DynamicForm
          schema={chosen.intake_schema}
          values={values}
          files={files}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onFile={(k, f) => setFiles((p) => ({ ...p, [k]: f }))}
        />

        <div className="btn-row">
          <button className="btn" type="submit" disabled={busy || !siteId}>
            {busy ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>
    </>
  );
}
