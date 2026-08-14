// Renders whatever fields a request type defines in its intake_schema.
// Adding a new kind of request is a database row, not a code change.

export default function DynamicForm({ schema, values, files, onChange, onFile }) {
  const fields = schema?.fields ?? [];

  if (fields.length === 0) {
    return <p className="muted">Nothing else needed — just submit.</p>;
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
  const common = {
    id: f.key,
    name: f.key,
    required: Boolean(f.required),
  };

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
      return (
        <input
          {...common}
          type="file"
          accept={f.accept}
          onChange={(e) => onFile(f.key, e.target.files?.[0] ?? null)}
        />
      );

    case "select":
      return (
        <select {...common} value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)}>
          <option value="">Choose one</option>
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );

    case "date":
      return (
        <input {...common} type="date" value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} />
      );

    case "url":
      return (
        <input
          {...common}
          type="url"
          value={values[f.key] ?? ""}
          placeholder={f.placeholder ?? "https://"}
          onChange={(e) => onChange(f.key, e.target.value)}
        />
      );

    default:
      return (
        <input
          {...common}
          type="text"
          value={values[f.key] ?? ""}
          placeholder={f.placeholder ?? ""}
          onChange={(e) => onChange(f.key, e.target.value)}
        />
      );
  }
}
