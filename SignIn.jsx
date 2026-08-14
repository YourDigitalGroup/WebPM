import { useState } from "react";
import { supabase } from "../lib/supabase.js";

// Two ways in. Clients get a link because they sign in monthly and would
// forget a password. The team gets a password because they're here daily
// and clicking through email every morning gets old.
export default function SignIn({ brand }) {
  const [mode, setMode] = useState("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (mode === "link") {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.href },
      });
      setBusy(false);
      if (error) setError(error.message);
      else setSent(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) setError("That email and password didn't match. Try again.");
  }

  if (sent) {
    return (
      <>
        <h1>Check your email</h1>
        <p className="lede">
          We sent a sign-in link to <strong>{email}</strong>. It works once and expires in an hour.
        </p>
        <button className="linkbtn" onClick={() => { setSent(false); setEmail(""); }}>
          Use a different email
        </button>
      </>
    );
  }

  return (
    <>
      <h1>Sign in</h1>
      <p className="lede">
        {mode === "link"
          ? "Enter your email and we'll send you a link. No password needed."
          : "Enter your email and password."}
      </p>

      {error && <div className="notice bad">{error}</div>}

      <form onSubmit={submit}>
        <div className="field">
          <label className="lbl" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {mode === "password" && (
          <div className="field">
            <label className="lbl" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        <div className="btn-row">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Working…" : mode === "link" ? "Email me a link" : "Sign in"}
          </button>
          <button
            type="button"
            className="linkbtn"
            onClick={() => { setMode(mode === "link" ? "password" : "link"); setError(null); }}
          >
            {mode === "link" ? "Sign in with a password" : "Email me a link instead"}
          </button>
        </div>
      </form>
    </>
  );
}
