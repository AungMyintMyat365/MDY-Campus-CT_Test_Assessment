import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { session, profile, loginEmail, loginCoder } = useAuth();
  const [mode, setMode] = useState("staff");
  const [error, setError] = useState("");

  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [coderId, setCoderId] = useState("");
  const [coderPassword, setCoderPassword] = useState("");

  if (session && profile?.role === "center_lead") return <Navigate to="/lead/dashboard" replace />;
  if (session && profile?.role === "coach") return <Navigate to="/coach/dashboard" replace />;
  if (session && profile?.role === "coder") return <Navigate to="/coder/dashboard" replace />;

  async function handleStaffSubmit(e) {
    e.preventDefault();
    setError("");
    const { error: loginError } = await loginEmail(staffEmail, staffPassword);
    if (loginError) setError(loginError.message);
  }

  async function handleCoderSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { error: loginError } = await loginCoder(coderId, coderPassword);
      if (loginError) setError(loginError.message);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="container">
      <h1>CT Assessment Platform</h1>
      <p>Sign in as staff or coder.</p>

      <div className="tabs">
        <button className={mode === "staff" ? "active" : ""} onClick={() => setMode("staff")}>
          Coach / Lead
        </button>
        <button className={mode === "coder" ? "active" : ""} onClick={() => setMode("coder")}>
          Coder
        </button>
      </div>

      {mode === "staff" ? (
        <form className="card" onSubmit={handleStaffSubmit}>
          <label>Email</label>
          <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} required />
          <button type="submit">Sign In</button>
        </form>
      ) : (
        <form className="card" onSubmit={handleCoderSubmit}>
          <label>Coder ID</label>
          <input value={coderId} onChange={(e) => setCoderId(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={coderPassword} onChange={(e) => setCoderPassword(e.target.value)} required />
          <button type="submit">Sign In</button>
        </form>
      )}

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
