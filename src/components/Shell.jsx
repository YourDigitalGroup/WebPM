import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

// Every page sits inside this. The header is the only place the partner's
// identity appears on screen, so it carries the logo and nothing else.
export default function Shell({ brand, user, children, wide, team }) {
  return (
    <div className="shell">
      <header className="topbar">
        {brand?.logo
          ? <img className="logo" src={brand.logo} alt={brand.name ?? ""} />
          : <span className="wordmark">{brand?.name ?? "Website Requests"}</span>}
        <span className="spacer" />
        {user && team && (
          <Link className="linkbtn" to="/team/account" style={{ marginRight: 14 }}>
            Account
          </Link>
        )}
        {user && (
          <button className="linkbtn" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        )}
      </header>
      <main className={wide ? "wrap wide" : "wrap"}>{children}</main>
    </div>
  );
}
