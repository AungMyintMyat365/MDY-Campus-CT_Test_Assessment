import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase, supabaseConfigError } from "../lib/supabaseClient";
import { profileDisplayName } from "../lib/displayName";

export default function LeadCoachesPage() {
  const { profile } = useAuth();
  const [coaches, setCoaches] = useState([]);
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    if (!supabase) {
      setError(supabaseConfigError || "Supabase client is not configured");
      return;
    }

    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("id, full_name, nickname, email, is_active, created_at")
      .eq("role", "coach")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(`Load coaches failed: ${queryError.message}`);
      return;
    }
    setCoaches(data ?? []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("create-coach-account", {
        body: {
          full_name: fullName,
          nickname,
          email,
          temp_password: tempPassword,
        },
      });

      if (invokeError) {
        if (String(invokeError.message || "").toLowerCase().includes("jwt")) {
          setError("Session expired. Please sign out and sign in again.");
        } else {
          setError(invokeError.message || "Failed to create coach account");
        }
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      setMessage("Coach account created.");
      setFullName("");
      setNickname("");
      setEmail("");
      setTempPassword("");
      await loadCoaches();
    } catch (err) {
      setError(err?.message || "Failed to create coach account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Manage Coaches</h1>
      <p>Signed in as {profileDisplayName(profile)}.</p>
      <div className="row gap">
        <Link to="/lead/dashboard">Dashboard</Link>
        <Link to="/lead/classes">Classes</Link>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <h2>Create Coach Account</h2>
        <label>Full Name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <label>Nickname</label>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <label>Temporary Password</label>
        <input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} minLength={8} autoComplete="new-password" required />
        <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Coach"}</button>
      </form>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="card">
        <h2>Coach List</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Nickname</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((coach) => (
              <tr key={coach.id}>
                <td>{coach.full_name}</td>
                <td>{coach.nickname ?? "-"}</td>
                <td>{coach.email}</td>
                <td>{coach.is_active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
