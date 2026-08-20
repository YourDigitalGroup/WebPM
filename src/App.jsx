import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useSession, isTeam } from "./lib/useSession.js";
import { useBrand } from "./lib/useBrand.js";
import Shell from "./components/Shell.jsx";
import SignIn from "./pages/SignIn.jsx";
import ClientHome from "./pages/ClientHome.jsx";
import NewRequest from "./pages/NewRequest.jsx";
import RequestDetail from "./pages/RequestDetail.jsx";
import TeamQueue from "./pages/TeamQueue.jsx";
import Onboard from "./pages/Onboard.jsx";
import ManageQueue from "./pages/ManageQueue.jsx";
import Clients from "./pages/Clients.jsx";
import Account from "./pages/Account.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/team"      element={<TeamArea />} />
      <Route path="/team/new-client" element={<TeamArea onboard />} />
      <Route path="/team/all"        element={<TeamArea manage />} />
      <Route path="/team/clients"    element={<TeamArea clients />} />
      <Route path="/team/account"    element={<TeamArea account />} />
      <Route path="/team/:id"  element={<TeamArea detail />} />
      <Route path="/:slug"     element={<PartnerArea page="home" />} />
      <Route path="/:slug/new" element={<PartnerArea page="new" />} />
      <Route path="/:slug/:id" element={<PartnerArea page="detail" />} />
      <Route path="*"          element={<Landing />} />
    </Routes>
  );
}

/* Anything under /{slug} carries that partner's branding, signed in or not. */
function PartnerArea({ page }) {
  const { slug } = useParams();
  const brand = useBrand(slug);
  const { loading, user, profile, role } = useSession();

  if (loading || brand === null) {
    return <Shell brand={brand}><p className="loading">Loading…</p></Shell>;
  }

  if (!user) {
    return <Shell brand={brand}><SignIn brand={brand} /></Shell>;
  }

  return (
    <Shell brand={brand} user={user}>
      {page === "home"   && <ClientHome profile={profile} />}
      {page === "new"    && <NewRequest user={user} />}
      {page === "detail" && <RequestDetail user={user} role={role} />}
    </Shell>
  );
}

/* The team's own area: no partner branding, since nobody here is a client. */
function TeamArea({ detail, onboard, manage, clients, account }) {
  const brand = useBrand(null);
  const { loading, user, profile, role } = useSession();

  if (loading) return <Shell brand={brand}><p className="loading">Loading…</p></Shell>;
  if (!user)   return <Shell brand={brand}><SignIn brand={brand} /></Shell>;

  if (!isTeam(role)) {
    return (
      <Shell brand={brand} user={user}>
        <div className="empty"><p style={{ margin: 0 }}>This area is for the team.</p></div>
      </Shell>
    );
  }

  return (
    <Shell brand={brand} user={user} wide team>
      {account ? <Account profile={profile} role={role} />
        : onboard ? <Onboard />
        : clients ? <Clients />
        : manage ? <ManageQueue />
        : detail ? <RequestDetail user={user} role={role} />
        : <TeamQueue user={user} profile={profile} role={role} />}
    </Shell>
  );
}

/* Bare root. Team members go to their queue; anyone else needs a partner path. */
function Landing() {
  const brand = useBrand(null);
  const { loading, user, role } = useSession();

  if (loading) return <Shell brand={brand}><p className="loading">Loading…</p></Shell>;
  if (user && isTeam(role)) return <Navigate to="/team" replace />;

  return (
    <Shell brand={brand} user={user}>
      <h1>Website Requests</h1>
      <p className="lede">
        Use the link your account manager sent you. It includes your company's own address.
      </p>
    </Shell>
  );
}
