import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import DynamicForm from "../components/DynamicForm.jsx";

// Step two. The type is picked on the landing page and arrives as ?type=,
// so this page only asks for the details that type defines.
// Deliberately no "which page" field: a client who could answer that
// reliably would have pointed at it on the site instead.

export default function NewRequest({ user }) {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const typeKey = params.get("type");
  const siteParam = params.get("site");

  const [type, setType] = useState(undefined);
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState(siteParam ?? "");
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;

    Promise.all([
      supabase.from("request_types")
        .select("id, key, label, description, category, intake_schema")
        .eq("key", typeKey ?? "").maybeSingle(),
      supabase.from("sites").select("id, name, url").eq("status", "active").order("name"),
    ]).then(([t, s]) => {
      if (!live) return;
      setType(t.data ?? null);
      setSites(s.data ?? []);
      if (!siteParam && (s.data ?? []).length === 1) setSiteId(s.data[0].id);
    });

    return () => { live = false; };
  }, [typeKey, siteParam]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { data: created, error: insertError } = await supabase
      .from("requests")
      .insert({
        site_id: siteId,
        request_type_id: type.id,
        submitted_by: user.id,
        category: type.category,
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

  if (type === undefined) return <p className="loading">Loading…</p>;

  if (type === null) {
    return (
      <>
        <Link className="back" to={`/${slug}`}>&larr; Back</Link>
        <div className="empty">
          <p>We couldn't find that kind of request.</p>
          <Link className="btn ghost small" to={`/${slug}`}>Start again</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Link className="back" to={`/${slug}`}>&larr; Choose something else</Link>
      <h1>{type.label}</h1>
      {type.description && <p className="lede">{type.description}</p>}

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
          schema={type.intake_schema}
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
