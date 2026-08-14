import { Link } from "react-router-dom";

const STAMP = {
  pending:               { text: "In progress", tone: "open" },
  completed:             { text: "Ready to check", tone: "done" },
  awaiting_confirmation: { text: "Ready to check", tone: "done" },
  closed:                { text: "Closed", tone: "closed" },
  needs_info:            { text: "Needs info", tone: "attention" },
  cancelled:             { text: "Cancelled", tone: "closed" },
};

export function Stamp({ status }) {
  const s = STAMP[status] ?? { text: status, tone: "closed" };
  return <span className={`stamp ${s.tone}`}>{s.text}</span>;
}

export function shortRef(id) {
  return id ? id.slice(0, 8).toUpperCase() : "";
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// A request rendered as a work order: title and stamp up top, ruled
// metadata below. Used in every list.
export default function Ticket({ request, to }) {
  const type = request.request_types?.label ?? "Request";
  const site = request.sites?.name;

  const body = (
    <>
      <div className="ticket-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="title">{type}</p>
          <span className="ref">#{shortRef(request.id)}</span>
        </div>
        <Stamp status={request.status} />
      </div>
      <dl className="rows">
        {site && (
          <div className="row"><dt>Site</dt><dd>{site}</dd></div>
        )}
        {request.page_url && (
          <div className="row"><dt>Page</dt><dd>{request.page_url}</dd></div>
        )}
        <div className="row"><dt>Submitted</dt><dd>{formatDate(request.created_at)}</dd></div>
      </dl>
    </>
  );

  return to
    ? <Link className="ticket" to={to}>{body}</Link>
    : <div className="ticket">{body}</div>;
}
