import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import DynamicForm from "../components/DynamicForm.jsx";

// Step two. The type is picked on the landing page and arrives as ?type=.
//
// "Which page" is a list of their actual pages, read from the site at
// onboarding. Asking a client to paste a URL was the wrong question — most
// don't know it, and the ones who guess get it wrong.

export default function NewRequest({ user }) {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const typeKey = params.get("type");
  const siteParam = params.get("site");

  const [type, setType] = useState(undefined);
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState(siteParam ?? "");
  const [pages, setPages] = useState([]);
  const [pageId, setPageId] = useState("");
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

  // Pages depend on which site is selected
  useEffect(() => {
    let live = true;
    if (!siteId) { setPages([]); return; }

    supabase.from("site_pages")
      .select("id, title, url")
      .eq("site_id", siteId).eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => { if (live) setPages(data ?? []); });

    return () => { live = false; };
  }, [siteId]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const page = pages.find((p) => p.id === pageId);

    const { data: created, error: insertError } = await supabase
      .from("requests")
      .insert({
        site_id: siteId,
        request_type_id: type.id,
        submitted_by: user.id,
        category: type.category,
        title: "pending",
        due_date: new Date().toISOString().slice(0, 10),
        site_page_id: pageId || null,
        page_url: page?.url ?? null,
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

  const selectedPage = pages.find((p) => p.id === pageId);

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
            <select id="site" required value={siteId}
                    onChange={(e) => { setSiteId(e.target.value); setPageId(""); }}>
              <option value="">Choose one</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {pages.length > 0 && (
          <div className="field">
            <label className="lbl" htmlFor="page">
              Which page?
              <span className="hint">Not sure? Leave it and we'll work it out</span>
            </label>
            <select id="page" value={pageId} onChange={(e) => setPageId(e.target.value)}>
              <option value="">Choose a page</option>
              {pages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            {selectedPage && (
              <p className="muted" style={{ marginTop: 6 }}>
                <a href={selectedPage.url} target="_blank" rel="noreferrer">
                  Open that page &rarr;
                </a>
              </p>
            )}
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
