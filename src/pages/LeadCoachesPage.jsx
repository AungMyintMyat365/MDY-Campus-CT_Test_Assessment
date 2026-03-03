import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { profileDisplayName } from "../lib/displayName";

export default function LeadCoachesPage() {
  const { profile } = useAuth();
  const [coaches, setCoaches] = useState([]);
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState("full_name,nickname,email,temp_password");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("id, full_name, nickname, email, is_active, created_at")
      .eq("role", "coach")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      return;
    }
    setCoaches(data ?? []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { data, error: invokeError } = await supabase.functions.invoke("create-coach-account", {
      body: {
        full_name: fullName,
        nickname,
        email,
        temp_password: tempPassword,
      },
    });

    setLoading(false);
    if (invokeError) {
      setError(invokeError.message);
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
    loadCoaches();
  }

  async function handleImportSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setImporting(true);

    const { data, error: invokeError } = await supabase.functions.invoke("import-coaches-csv", {
      body: { csv: csvText },
    });

    setImporting(false);
    if (invokeError) {
      setError(invokeError.message);
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }

    setMessage(`Import done. Success: ${data.success_count}, Failed: ${data.failure_count}`);
    loadCoaches();
  }

  async function handleCsvFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
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
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Temporary Password</label>
        <input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} minLength={8} required />
        <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Coach"}</button>
      </form>

      <form className="card" onSubmit={handleImportSubmit}>
        <h2>Import Coaches CSV</h2>
        <label>Upload CSV File</label>
        <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} />
        <label>Or Paste CSV</label>
        <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8} />
        <button type="submit" disabled={importing}>{importing ? "Importing..." : "Import Coaches"}</button>
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
