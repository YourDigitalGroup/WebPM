import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

// Everyone starts on the same password, which means the system can't tell
// people apart until they change it. This is where they do.

const MIN = 8;

export default function Account({ profile, role }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN) {
      setError(`Use at least ${MIN} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those two don't match.");
      return;
    }

    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (err) { setError(err.message); return; }

    setPassword("");
    setConfirm("");
    setDone(true);
  }

  return (
    <>
      <Link className="back" to="/team">&larr; Back</Link>
      <h1>Your account</h1>

      <dl className="rows" style={{ background: "#fff", border: "1px solid var(--edge)", borderRadius: "var(--r)", marginBottom: 30 }}>
        <div className="row"><dt>Name</dt><dd>{profile?.full_name ?? "—"}</dd></div>
        <div className="row"><dt>Email</dt><dd>{profile?.email ?? "—"}</dd></div>
        <div className="row"><dt>Role</dt><dd>{roleLabel(role)}</dd></div>
      </dl>

      <h2>Change your password</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Everyone was set up with the same starting password. Changing yours means
        the system can tell your work from everyone else's.
      </p>

      {done && <div className="notice good">Password changed. It's in effect now.</div>}
      {error && <div className="notice bad">{error}</div>}

      <form onSubmit={submit}>
        <div className="field">
          <label className="lbl" htmlFor="pw">
            New password
            <span className="hint">At least {MIN} characters</span>
          </label>
          <input id="pw" type="password" autoComplete="new-password" required
                 value={password} onChange={(e) => { setPassword(e.target.value); setDone(false); }} />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="pw2">Type it again</label>
          <input id="pw2" type="password" autoComplete="new-password" required
                 value={confirm} onChange={(e) => { setConfirm(e.target.value); setDone(false); }} />
        </div>

        <div className="btn-row">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </>
  );
}

function roleLabel(role) {
  return {
    admin: "Administrator",
    account_manager: "Account manager",
    wordpress_dev: "WordPress developer",
    fourge_dev: "FOURGE developer",
    content_specialist: "Content specialist",
    account_executive: "Account executive",
    advertiser: "Client",
  }[role] ?? "—";
}
