import { useRef, useState } from "react";

// Renders whatever fields a request type defines in its intake_schema.
// Adding a new kind of request is a database row, not a code change.

const MAX_MB = 50;
const MAX_BYTES = MAX_MB * 1024 * 1024;

export default function DynamicForm({ schema, values, files, onChange, onFile }) {
  const fields = schema?.fields ?? [];

  if (fields.length === 0) {
    return <p className="muted">Nothing else needed — just send it.</p>;
  }

  return fields.map((f) => (
    <div className="field" key={f.key}>
      <label className="lbl" htmlFor={f.key}>
        {f.label}
        {!f.required && <span className="hint">Optional</span>}
      </label>
      {renderInput(f, values, files, onChange, onFile)}
    </div>
  ));
}

function renderInput(f, values, files, onChange, onFile) {
  const common = { id: f.key, name: f.key, required: Boolean(f.required) };

  switch (f.type) {
    case "textarea":
      return (
        <textarea
          {...common}
          value={values[f.key] ?? ""}
          placeholder={f.placeholder ?? ""}
          onChange={(e) => onChange(f.key, e.target.value)}
        />
      );

    case "file":
      return <FileField field={f} file={files[f.key]} onFile={onFile} />;

    case "select":
      return (
        <select {...common} value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)}>
          <option value="">Choose one</option>
          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );

    case "date":
      return (
        <input {...common} type="date" value={values[f.key] ?? ""}
               onChange={(e) => onChange(f.key, e.target.value)} />
      );

    case "url":
      return (
        <input {...common} type="url" value={values[f.key] ?? ""}
               placeholder={f.placeholder ?? "https://"}
               onChange={(e) => onChange(f.key, e.target.value)} />
      );

    default:
      return (
        <input {...common} type="text" value={values[f.key] ?? ""}
               placeholder={f.placeholder ?? ""}
               onChange={(e) => onChange(f.key, e.target.value)} />
      );
  }
}

// The browser's own file input is ugly and says nothing about limits.
// This wraps it: drop target, clear size guidance, and a readable
// confirmation once something is chosen.
function FileField({ field, file, onFile }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState(null);

  const kind = (field.accept ?? "").includes("video") ? "video"
             : (field.accept ?? "").includes("image") ? "image"
             : "file";

  function take(picked) {
    setProblem(null);
    if (!picked) { onFile(field.key, null); return; }

    if (picked.size > MAX_BYTES) {
      setProblem(`That's ${mb(picked.size)}, over the ${MAX_MB} MB limit.`);
      onFile(field.key, null);
      if (input.current) input.current.value = "";
      return;
    }

    onFile(field.key, picked);
  }

  if (file) {
    return (
      <>
        <div className="file-chosen">
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{file.name}</strong>
            <span>{mb(file.size)}</span>
          </div>
          <button type="button" className="linkbtn" onClick={() => {
            onFile(field.key, null);
            if (input.current) input.current.value = "";
          }}>
            Remove
          </button>
        </div>
        <input ref={input} id={field.key} type="file" accept={field.accept}
               style={{ display: "none" }}
               onChange={(e) => take(e.target.files?.[0] ?? null)} />
      </>
    );
  }

  return (
    <>
      <div
        className={over ? "file-drop over" : "file-drop"}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0] ?? null);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") input.current?.click(); }}
      >
        <strong>Choose a {kind}</strong>
        <span>or drag it here · up to {MAX_MB} MB</span>
      </div>

      {problem && <p className="file-problem">{problem}</p>}

      {kind === "video" && (
        <p className="muted" style={{ marginTop: 6 }}>
          Large video? A YouTube or Vimeo link works just as well.
        </p>
      )}

      <input ref={input} id={field.key} type="file" accept={field.accept}
             required={Boolean(field.required)}
             style={{ display: "none" }}
             onChange={(e) => take(e.target.files?.[0] ?? null)} />
    </>
  );
}

function mb(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
